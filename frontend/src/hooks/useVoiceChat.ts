import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = "/api/proxy";
// OpenAI Realtime WSS endpoint — browser connects directly using ephemeral token
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

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
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
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
  // When true, next tutor transcript delta must start a new line (don't append to cancelled partial)
  const newTutorLineRef = useRef(true);
  // Index of the pending "You: ..." placeholder in transcript; -1 if none
  const pendingStudentIndexRef = useRef(-1);
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
    newTutorLineRef.current = true; // force new line after cancel
    setIsAISpeaking(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "response.cancel" }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current) return;
    setError(null);

    // Get ephemeral token from backend (HTTP, goes through Next.js proxy)
    let ephemeralToken: string;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Not authenticated."); return; }
      const res = await fetch(`${API_URL}/api/voice/session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`Session error: ${res.status}`);
      const data = await res.json();
      ephemeralToken = data.client_secret?.value ?? data.client_secret ?? data.token;
      if (!ephemeralToken) throw new Error("No ephemeral token in response");
    } catch (err) {
      setError("Failed to start voice session. Please try again.");
      console.error("[VoiceChat] Session error:", err);
      return;
    }

    // Connect directly to OpenAI Realtime using ephemeral token (WSS — no mixed content)
    const ws = new WebSocket(OPENAI_REALTIME_URL, ["realtime", `openai-insecure-api-key.${ephemeralToken}`, "openai-beta.realtime-v1"]);
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
- ALWAYS respond in English regardless of what language the student speaks
- Use the Socratic method — ask guiding questions rather than giving direct answers
- Be patient, encouraging, and age-appropriate in language
- Relate explanations to the key concepts listed above
- After answering, check the student's understanding with a follow-up question
- If the student seems confused, break the concept into smaller steps
- Keep responses concise and conversational for voice format
- Ignore background noise, filler words, or off-topic utterances — only respond to genuine lesson-related questions`;

      // Define tools for the AI tutor to call
      const tools = [
        {
          type: "function",
          name: "show_youtube_video",
          description: "Show an educational YouTube video to visually explain a concept. Use your knowledge to pick a specific video_id from channels like Khan Academy, CrashCourse, Kurzgesagt, TED-Ed that explains the current concept.",
          parameters: {
            type: "object",
            properties: {
              video_id: { type: "string", description: "YouTube video ID (e.g. 'kosggg5uXFo')" },
              title: { type: "string", description: "Display title for the embed" },
              concept: { type: "string", description: "What concept this explains" }
            },
            required: ["video_id", "title"]
          }
        },
        {
          type: "function",
          name: "show_diagram",
          description: "Render a Mermaid.js diagram to explain a process, cycle, or relationship visually.",
          parameters: {
            type: "object",
            properties: {
              mermaid_code: { type: "string", description: "Valid Mermaid.js markup" },
              title: { type: "string", description: "Diagram title" }
            },
            required: ["mermaid_code", "title"]
          }
        },
        {
          type: "function",
          name: "ask_comprehension_question",
          description: "Pause and ask the student a question to check understanding. The student can answer verbally or by typing.",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string", description: "The question to ask" },
              hint: { type: "string", description: "Optional hint if student struggles" }
            },
            required: ["question"]
          }
        }
      ];

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
              threshold: 0.75,
              silence_duration_ms: 1000,
              prefix_padding_ms: 300,
            },
            tools: tools,
            tool_choice: "auto"
          },
        })
      );

      // Auto-initiate conversation: send opening message + trigger first response
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "Please start the lesson now." }]
          }
        }));
        ws.send(JSON.stringify({ type: "response.create" }));
      }, 100);
    };

    ws.onmessage = (event) => {
      // OpenAI Realtime sends everything as JSON text, not binary
      if (event.data instanceof ArrayBuffer) return;

      try {
        const msg = JSON.parse(event.data as string);

        // Student started speaking — interrupt AI if needed, add placeholder immediately
        if (msg.type === "input_audio_buffer.speech_started") {
          if (isAISpeakingRef.current) {
            cancelAIResponse();
          }
          // Insert placeholder so student's turn appears in the right position
          setTranscript((prev) => {
            pendingStudentIndexRef.current = prev.length;
            return [...prev, "You: …"];
          });
          newTutorLineRef.current = true; // next AI response starts a fresh line
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

        // Tool/function call from AI — send to parent component handler
        if (msg.type === "response.output_item.done" && msg.item?.type === "function_call") {
          const toolName = msg.item.name;
          const toolArgs = msg.item.arguments ? JSON.parse(msg.item.arguments) : {};

          // Call parent's tool handler
          if (optionsRef.current.onToolCall) {
            optionsRef.current.onToolCall(toolName, toolArgs);
          }

          // Send function output back to continue conversation
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.item.id,
                output: JSON.stringify({ status: "success", tool: toolName })
              }
            }));
            ws.send(JSON.stringify({ type: "response.create" }));
          }
        }

        // Student speech transcript — replace the placeholder at the correct position
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          const text = msg.transcript?.trim();
          if (text) {
            const idx = pendingStudentIndexRef.current;
            pendingStudentIndexRef.current = -1;
            setTranscript((prev) => {
              if (idx >= 0 && idx < prev.length) {
                const updated = [...prev];
                updated[idx] = `You: ${text}`;
                return updated;
              }
              // Fallback: append if placeholder index is gone
              return [...prev, `You: ${text}`];
            });
          }
        }

        // Tutor transcript — audio responses use audio_transcript.delta, text-only use text.delta
        if (
          (msg.type === "response.audio_transcript.delta" || msg.type === "response.text.delta") &&
          msg.delta
        ) {
          if (newTutorLineRef.current) {
            // Start a fresh tutor line (first delta of a new response)
            newTutorLineRef.current = false;
            setTranscript((prev) => [...prev, `Tutor: ${msg.delta}`]);
          } else {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last?.startsWith("Tutor:")) {
                return [...prev.slice(0, -1), last + msg.delta];
              }
              return [...prev, `Tutor: ${msg.delta}`];
            });
          }
        }

        // Mark that the next response needs a fresh tutor line
        if (msg.type === "response.done") {
          newTutorLineRef.current = true;
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

  const injectSentimentContext = useCallback((emotion: string, confidence: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send emotion context as a hidden system message (user message, but understood as context)
    const contextMessage = `[Context: Student appears ${emotion} (confidence: ${(confidence * 100).toFixed(0)}%). Please adjust your teaching approach accordingly.]`;

    wsRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: contextMessage }]
      }
    }));
    // Do NOT send response.create here — let the AI adapt naturally in its next turn
  }, []);

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
    injectSentimentContext,
  };
}
