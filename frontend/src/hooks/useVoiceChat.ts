import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = API_URL.replace(/^http/, "ws");

// Safely decode base64 to Uint8Array without spread-overflow risk
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Safely encode Uint8Array to base64 without spread-overflow risk
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Wrap raw 16-bit PCM bytes in a WAV container so decodeAudioData can play it
function pcmToWav(pcmBytes: Uint8Array, sampleRate = 24000): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcmBytes);

  return buffer;
}

export interface UseVoiceChatOptions {
  lessonTitle?: string;
  chapterId?: string;
  chapterDescription?: string;
  keyConcepts?: string[];
  summary?: string;
  grade?: string;
  board?: string;
  subjectName?: string;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  // Accumulate PCM chunks for the current response; play all at once on response.audio.done
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const isAISpeakingRef = useRef(false);
  // Keep options in a ref so callbacks don't go stale
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const appendTranscript = useCallback((line: string) => {
    setTranscript((prev) => [...prev, line]);
  }, []);

  const playAccumulatedAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;

    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];

    // Concatenate all PCM chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    try {
      const ctx = audioContextRef.current ?? new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const wavBuffer = pcmToWav(combined);
      const decoded = await ctx.decodeAudioData(wavBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => {
        // Only clear speaking state if no new response started
        if (!isAISpeakingRef.current) {
          setIsAISpeaking(false);
        }
      };
      source.start();
    } catch (e) {
      console.error("[VoiceChat] Audio playback error:", e);
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
    }
  }, []);

  const cancelAIResponse = useCallback(() => {
    audioChunksRef.current = [];
    isAISpeakingRef.current = false;
    setIsAISpeaking(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "response.cancel" }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setError(null);

    const ws = new WebSocket(`${WS_URL}/api/voice/ws`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      const { lessonTitle, chapterDescription, keyConcepts, summary, grade, board, subjectName } = optionsRef.current;

      // Build a rich, lesson-aware system prompt
      let instructions = `You are an expert AI tutor for K-12 students`;
      if (grade) instructions += ` in Grade ${grade}`;
      if (board) instructions += ` following the ${board} curriculum`;
      instructions += `.\n\n`;

      if (subjectName) instructions += `Subject: ${subjectName}\n`;
      if (lessonTitle) instructions += `Current lesson: "${lessonTitle}"\n`;
      if (chapterDescription) instructions += `Lesson overview: ${chapterDescription}\n`;

      if (keyConcepts && keyConcepts.length > 0) {
        instructions += `\nKey concepts covered in this lesson:\n${keyConcepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
      }

      if (summary) instructions += `\nLesson summary: ${summary}\n`;

      instructions += `
Teaching approach:
- Use the Socratic method — ask guiding questions rather than giving direct answers
- Be patient, encouraging, and age-appropriate in language
- Relate explanations to the key concepts listed above
- After answering, check the student's understanding with a follow-up question
- If the student seems confused, break the concept into smaller steps
- Keep responses concise and conversational for voice format`;

      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions,
            voice: "alloy",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 800,
            },
          },
        })
      );
    };

    ws.onmessage = (event) => {
      // OpenAI Realtime sends everything as JSON text, not binary
      if (event.data instanceof ArrayBuffer) return;

      try {
        const msg = JSON.parse(event.data as string);

        // Student started speaking — interrupt AI if it's mid-response
        if (msg.type === "input_audio_buffer.speech_started") {
          if (isAISpeakingRef.current) {
            cancelAIResponse();
          }
        }

        // Accumulate PCM chunks as they arrive
        if (msg.type === "response.audio.delta" && msg.delta) {
          isAISpeakingRef.current = true;
          setIsAISpeaking(true);
          audioChunksRef.current.push(base64ToUint8Array(msg.delta));
        }

        // All audio for this response has been sent — now play it
        if (msg.type === "response.audio.done") {
          playAccumulatedAudio();
        }

        // Response fully complete
        if (msg.type === "response.done") {
          isAISpeakingRef.current = false;
          // setIsAISpeaking(false) is deferred until audio playback ends (in source.onended)
        }

        // Student speech transcript
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          if (msg.transcript?.trim()) {
            appendTranscript(`You: ${msg.transcript.trim()}`);
          }
        }

        // Tutor transcript — audio responses use audio_transcript.delta, text-only use text.delta
        if (
          (msg.type === "response.audio_transcript.delta" || msg.type === "response.text.delta") &&
          msg.delta
        ) {
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last?.startsWith("Tutor:")) {
              return [...prev.slice(0, -1), last + msg.delta];
            }
            return [...prev, `Tutor: ${msg.delta}`];
          });
        }

        // Surface API-level errors to the user
        if (msg.type === "error") {
          const errMsg = msg.error?.message ?? "An error occurred in the voice session.";
          setError(errMsg);
          console.error("[VoiceChat] OpenAI error:", msg.error);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsListening(false);
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      wsRef.current = null;
    };

    ws.onerror = () => {
      setError("Failed to connect to voice service. Check that the backend is running.");
      ws.close();
    };
  }, [appendTranscript, playAccumulatedAudio, cancelAIResponse]);

  const disconnect = useCallback(() => {
    setIsListening(false);
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    audioChunksRef.current = [];
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const toggleListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (isListening) {
      processorRef.current?.disconnect();
      processorRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const ctx = audioContextRef.current ?? new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const floatData = e.inputBuffer.getChannelData(0);
          // Convert float32 samples to int16 PCM
          const pcm = new Int16Array(floatData.length);
          for (let i = 0; i < floatData.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, Math.round(floatData[i] * 32767)));
          }
          const base64 = uint8ArrayToBase64(new Uint8Array(pcm.buffer));
          wsRef.current.send(
            JSON.stringify({ type: "input_audio_buffer.append", audio: base64 })
          );
        };

        source.connect(processor);
        // Connect to a silent gain node (volume=0) so onaudioprocess fires without echo
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(ctx.destination);
        setIsListening(true);
        setError(null);
      } catch {
        setError("Microphone access denied. Please allow microphone permissions and try again.");
      }
    }
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isAISpeaking,
    transcript,
    error,
    connect,
    disconnect,
    toggleListening,
  };
}
