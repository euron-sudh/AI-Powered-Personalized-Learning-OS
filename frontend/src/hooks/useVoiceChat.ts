import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice tutor hook — Gemini Live API backend.
 *
 * The browser connects to a backend WebSocket at /api/voice/gemini. The
 * backend verifies the Supabase JWT, opens an upstream WS to Gemini Live
 * using the server-side GEMINI_API_KEY, and forwards frames in both
 * directions. Keeping the key server-side is the reason for the proxy;
 * Gemini doesn't support in-browser ephemeral tokens the way OpenAI does.
 *
 * Gemini Live specifics we rely on:
 *   - input audio: 16 kHz mono PCM16 sent as `realtimeInput.mediaChunks`
 *   - output audio: 24 kHz mono PCM16 received as `serverContent.modelTurn.parts[].inlineData`
 *   - input transcription enabled via `inputAudioTranscription: {}` in setup
 *   - output transcription enabled via `outputAudioTranscription: {}` in setup
 *   - interruption handled by Gemini automatically; we listen for
 *     `serverContent.interrupted` and flush local playback
 *   - tool calls arrive as `toolCall.functionCalls[]` with {name, args, id};
 *     we ack each with a `toolResponse.functionResponses[]` frame so Gemini
 *     doesn't stall waiting for one.
 */

// Voice input must be 16 kHz for Gemini Live. If the browser can't create an
// AudioContext at that rate (rare) we fall back to 48 kHz and resample.
const INPUT_SAMPLE_RATE = 16000;
// Gemini Live emits 24 kHz output PCM.
const OUTPUT_SAMPLE_RATE = 24000;

// Gemini Live model selection — chosen empirically from a side-by-side
// test of every bidi-capable model our API key can reach (2026-04-24):
//
//   • gemini-3.1-flash-live-preview        — returns ZERO audio on our key
//                                             (preview, not GA).
//   • gemini-2.5-flash-native-audio-latest — a floating alias; silently
//                                             flips versions. Tool-calling
//                                             broke in last test.
//   • gemini-2.5-flash-native-audio-preview-12-2025
//                                           — ships audio on plain prompts
//                                             BUT silently produces no
//                                             audio and no tool call when a
//                                             diagram is requested. Tools
//                                             are broken on this revision.
//   • gemini-2.5-flash-native-audio-preview-09-2025  ← CURRENT PIN
//                                           — natural conversational voice,
//                                             tool-calling works, supports
//                                             maxOutputTokens + NO_INTERRUPTION.
//                                             The only native-audio revision
//                                             where everything works today.
//
// Re-test this list if Google ships a newer Live model; pick the newest
// one where tool-calling + narration both fire on "show me a diagram of X".
const GEMINI_MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025";
// "Aoede" = soft/warm female; "Kore" = professional female; "Puck" = playful.
// The user asked for calm / gentle / student-friendly → Aoede.
const GEMINI_VOICE = "Aoede";

// Visual tools the tutor can trigger while speaking. The lesson page handles
// each in its `onToolCall` prop (see [subjectId]/[chapterId]/page.tsx).
// Gemini Live wants Schema types in UPPERCASE (STRING / OBJECT / ...).
const TUTOR_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "show_diagram",
        description:
          "Render a Mermaid.js diagram on the lesson stage. Use for structural concepts (process flows, hierarchies, comparisons, cycles). Prefer `flowchart TD` or `graph LR`. Keep to ~8 nodes max. WHENEVER the concept has a concrete visual form (an art element like 'line' or 'color', a biological organism, a physical phenomenon, a historical artifact, a famous painting), ALSO pass `image_query` with a short Wikipedia-style title (e.g. 'Mona Lisa', 'Mitosis', 'Line (art)'). The app will fetch a real Wikipedia/Commons image for you automatically — do NOT try to construct image URLs yourself.",
        parameters: {
          type: "OBJECT",
          properties: {
            mermaid_code: {
              type: "STRING",
              description: "Valid Mermaid.js source. Do NOT wrap in code fences.",
            },
            title: { type: "STRING", description: "Short caption for the diagram." },
            image_query: {
              type: "STRING",
              description: "Preferred. A short concept phrase like 'Mona Lisa' or 'Mitosis'. The frontend resolves it to a real Wikipedia image. No URLs required from you.",
            },
            image_url: {
              type: "STRING",
              description: "Discouraged — use image_query instead. If you genuinely remember a correct public URL, pass it here. Otherwise OMIT.",
            },
            image_alt: {
              type: "STRING",
              description: "Alt text for accessibility (optional).",
            },
          },
          required: ["mermaid_code", "title"],
        },
      },
      {
        name: "show_video",
        description:
          "Find and play a short educational video clip INLINE on the lesson stage. Pass a natural-language `query` describing what the video should show (e.g. 'how mitosis works animation', 'Van Gogh Starry Night brushstroke closeup') — the app searches YouTube for a safe, embeddable, SHORT clip (under 4 minutes) that matches. Do NOT pass video_id. start_seconds and end_seconds are optional: use them only if you want to trim to a specific highlight within a longer clip.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Natural-language search query describing the video content. Be specific (e.g. 'types of lines in drawing for kids', NOT 'art video').",
            },
            title: { type: "STRING", description: "Short caption for the clip." },
            concept: {
              type: "STRING",
              description: "Which concept this clip illustrates (one phrase).",
            },
            start_seconds: {
              type: "NUMBER",
              description: "Optional. Start time in whole seconds to skip an intro and jump to the key moment.",
            },
            end_seconds: {
              type: "NUMBER",
              description: "Optional. End time in whole seconds to trim a longer clip. Omit to play the full short video.",
            },
          },
          required: ["query", "title"],
        },
      },
      {
        name: "show_image",
        description:
          "Display an image on the lesson stage. ONLY call with a well-known public image URL (Wikimedia Commons preferred). NEVER invent URLs — if unsure, skip.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "Direct https:// image URL." },
            title: { type: "STRING", description: "Short caption." },
            alt: { type: "STRING", description: "Alt text for accessibility." },
          },
          required: ["url", "title"],
        },
      },
    ],
  },
];

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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
  quizTopic?: string;
  quizCorrect?: string;
  quizChosen?: string;
  // onToolCall may return a Promise. When it does, we delay the tool ack
  // to Gemini until the promise resolves — Gemini holds its turn during
  // that window, so the tutor stays silent while e.g. a YouTube clip
  // plays, and resumes speaking the moment the caller signals "done".
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void | Promise<void>;
}

function buildSystemPrompt(opts: UseVoiceChatOptions): string {
  let s = "You are a warm, patient K-12 voice tutor";
  if (opts.grade) s += ` for a Grade ${opts.grade} student`;
  if (opts.board) s += ` (${opts.board} curriculum)`;
  s += ".\n";
  if (opts.subjectName) s += `Subject: ${opts.subjectName}. `;
  if (opts.lessonTitle) s += `Lesson: "${opts.lessonTitle}". `;
  if (opts.chapterDescription) s += `Overview: ${opts.chapterDescription} `;
  if (opts.keyConcepts?.length) s += `Key concepts: ${opts.keyConcepts.join("; ")}. `;
  if (opts.summary) s += `Summary: ${opts.summary}`;
  s += `

VOICE: Calm teacher pace. Simple words, short sentences. English only (never Devanagari). Student speech is Indian-accented English.

TURN SHAPE (~4–6 sentences as flowing prose):
 1) Plain-words definition.
 2) 1–2 sentences on why/how.
 3) One concrete everyday example (school, kitchen, sports, nature).
 4) One check question. Then STOP and wait.
If the student says "I don't know" or stays silent, rephrase with a simpler analogy and re-ask.

ACCURACY:
 - Stay in this lesson's scope. Redirect off-topic: "Great question — let's come back to it after this lesson."
 - Never invent facts/names/dates/numbers. If unsure, say "I'm not certain about that" and move on.
 - Unclear audio → ask one short clarifying question instead of guessing.

VISUALS — call show_diagram after EVERY concept. Don't ask permission, just call it.
 - tool: show_diagram(mermaid_code, title, image_query)
 - mermaid_code: flowchart TD with 6–9 nodes across TWO levels of depth (parent → 3–4 children → each child has a sub-detail). Add a relevant emoji to every label. Add classDef with themed colors (warm earthy for History, primaries for Art, greens/blues for Science, violets for Math, peaches for English). No markdown fences.
 - image_query: a specific Wikipedia page whose lead image IS the concept ("Hatching", "The Starry Night", "Mitosis", "Water cycle", "Pythagoras"). Avoid generic disambiguation titles ("Line (art)", "Color"). Always pass it.
 - Match the NARROW subtopic, not the whole chapter. "Types of lines" → Straight/Curved/Zigzag/Wavy, not Point→Line→Shape.
 - Announce the visual in ONE short line ("Here — let me show you"), call the tool, then continue explaining.

VIDEOS — show_video(query, title, start_seconds?, end_seconds?): only for inherently dynamic concepts (animation, brushstroke, chemistry reaction, newsreel, sports technique) or when the student asks. Pass a specific natural-language query; backend picks a short (<4 min) safe clip. IMPORTANT: calling show_video pauses you — the app holds your turn for the whole clip duration and you will resume speaking automatically after it ends. So say ONE short setup line first ("Here, watch this clip — it shows…"), THEN call the tool, THEN wait. Don't start a new explanation right before the call; finish your sentence first.

show_image(url, title, alt): only for a specific Wikimedia Commons URL you actually recall. Otherwise use show_diagram with image_query.`;
  return s;
}

function buildOpeningMessage(opts: UseVoiceChatOptions): string {
  if (opts.quizTopic) {
    return `Quiz miss: "${opts.quizTopic}". I chose "${opts.quizChosen ?? "something"}"; correct was "${opts.quizCorrect ?? "(not given)"}". Give ONE-sentence core idea, then ONE check question, then STOP.`;
  }
  return "Greet me in ONE short sentence and ask ONE warm-up question about this lesson. Then STOP and wait.";
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  // Synchronous guard against double-connect. `wsRef` alone isn't enough —
  // `connect()` does two awaits (`import('@/lib/supabase')`, then
  // `supabase.auth.getSession()`) BEFORE it assigns wsRef, and during that
  // window a second connect call (React StrictMode re-invocation, or
  // useCallback deps changing) passes the wsRef null-check and also creates
  // a WebSocket. Two parallel Gemini sessions then talk over each other —
  // which is exactly the "tutor is breaking / interrupting" symptom.
  const connectingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isAISpeakingRef = useRef(false);
  const disposedRef = useRef(false);

  // Mic gate: true for the WHOLE duration of an AI turn, even if the local
  // audio queue momentarily drains between chunks. We can't use
  // `isAISpeakingRef` for mic gating because it tracks queue state — when it
  // briefly flips false between Gemini chunks, speaker audio bleeds into the
  // mic, Gemini flags it as a student interruption, and stopAllPlayback cuts
  // the tutor off mid-word.
  //
  // The gate also must stay closed AFTER turnComplete until the local audio
  // queue drains — turnComplete fires when Gemini is done *sending* audio,
  // but the speakers are still playing those last chunks, and bleed during
  // that tail causes Gemini to restart itself on the next turn. That's what
  // produced the interleaved "Hello!Welcome toHello!" transcript.
  const aiTurnActiveRef = useRef(false);
  // Set true when turnComplete arrives; cleared when the audio queue
  // drains. While this is true we hold the mic gate closed even though
  // Gemini thinks the turn is done.
  const turnEndedAwaitingDrainRef = useRef(false);
  // Safety timer: if Gemini stops sending audio but never fires turnComplete
  // (it happens — model quirk), force-release the mic gate after a short
  // idle period. Otherwise the mic stays physically disabled forever and the
  // student's "it's not listening to me" symptom is permanent.
  const gateSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scheduled playback parts for gapless streaming
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlaybackTimeRef = useRef<number>(0);

  // Transcript line tracking
  const tutorLineIndexRef = useRef<number>(-1);
  const studentLineIndexRef = useRef<number>(-1);
  // Last time we appended a tutor chunk. Used to detect silence gaps so the
  // next chunk starts a fresh line instead of concatenating — the merge
  // that produced "Hello there! WhatHello! It's comes to mind..." word salad.
  const lastTutorChunkAtRef = useRef<number>(0);

  // Keep latest options accessible from callbacks without stale closures
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  // --- Audio helpers -----------------------------------------------------

  // Physically disable the mic track while the AI is speaking. Even with the
  // software gate and NO_INTERRUPTION, we don't want speaker bleed captured
  // at all — disabling the track means the OS/browser produces silence for
  // the duration, so echo cancellation has zero work to do.
  const setMicEnabled = useCallback((enabled: boolean) => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    for (const t of stream.getAudioTracks()) {
      if (t.enabled !== enabled) t.enabled = enabled;
    }
  }, []);

  const clearGateSafetyTimer = useCallback(() => {
    if (gateSafetyTimerRef.current) {
      clearTimeout(gateSafetyTimerRef.current);
      gateSafetyTimerRef.current = null;
    }
  }, []);

  const armGateSafetyTimer = useCallback(() => {
    clearGateSafetyTimer();
    gateSafetyTimerRef.current = setTimeout(() => {
      if (aiTurnActiveRef.current && scheduledSourcesRef.current.size === 0) {
        console.warn("[VoiceChat] gate safety timer fired — Gemini never sent turnComplete; force-opening mic");
        aiTurnActiveRef.current = false;
        turnEndedAwaitingDrainRef.current = false;
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
        setMicEnabled(true);
      }
    }, 1500);
  }, [clearGateSafetyTimer, setMicEnabled]);

  const stopAllPlayback = useCallback(() => {
    clearGateSafetyTimer();
    for (const src of scheduledSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
      try { src.disconnect(); } catch { /* ignore */ }
    }
    scheduledSourcesRef.current.clear();
    nextPlaybackTimeRef.current = 0;
    isAISpeakingRef.current = false;
    aiTurnActiveRef.current = false;
    turnEndedAwaitingDrainRef.current = false;
    setIsAISpeaking(false);
    setMicEnabled(true);
  }, [clearGateSafetyTimer, setMicEnabled]);

  // Decode synchronously so chunks schedule in the exact order they arrive.
  // Going through `decodeAudioData` previously awaited per-chunk, and because
  // decodes of small chunks can resolve out of order the tutor ended up
  // talking in scrambled word fragments. Gemini Live sends raw little-endian
  // PCM16 at 24 kHz mono, so we can convert straight into an AudioBuffer.
  const playPcmChunk = useCallback((chunk: Uint8Array) => {
    if (disposedRef.current) return;
    try {
      let ctx = outputContextRef.current;
      if (!ctx) {
        // Browsers may refuse a 24 kHz AudioContext on some hardware (e.g.
        // 48 kHz forced devices on Windows); fall back to the default rate
        // and let Web Audio resample the 24 kHz buffers at play time.
        try {
          ctx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        } catch {
          ctx = new AudioContext();
        }
        outputContextRef.current = ctx;
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const numSamples = chunk.byteLength >> 1; // 2 bytes per sample
      if (numSamples === 0) return;
      const audioBuffer = ctx.createBuffer(1, numSamples, OUTPUT_SAMPLE_RATE);
      const channel = audioBuffer.getChannelData(0);
      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      for (let i = 0; i < numSamples; i++) {
        const s = view.getInt16(i * 2, true);
        channel[i] = s < 0 ? s / 0x8000 : s / 0x7fff;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      // Drift guard: if nextPlaybackTime has fallen significantly behind the
      // AudioContext clock (tab was backgrounded, context suspended, etc.),
      // snap forward to now so chunks don't schedule in the past — that's
      // what produces robotic stuttering / runaway queue growth.
      if (nextPlaybackTimeRef.current < ctx.currentTime - 0.05) {
        nextPlaybackTimeRef.current = ctx.currentTime;
      }
      // Jitter buffer: the FIRST audio chunk of a turn is scheduled 150 ms
      // in the future. This gives Web Audio, the WebSocket pipeline, and the
      // network a cushion so later chunks arrive before the playhead needs
      // them. Without this, scheduling slips of just a few ms at chunk
      // boundaries produce audible clicks that sound like "the tutor is
      // cutting in and out." Continuation chunks inherit from the stable
      // timeline and stay sample-accurate back-to-back.
      const JITTER_S = 0.06;
      const isFirstOfTurn = nextPlaybackTimeRef.current === 0;
      const startAt = isFirstOfTurn
        ? ctx.currentTime + JITTER_S
        : Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
      scheduledSourcesRef.current.add(source);
      if (!aiTurnActiveRef.current) {
        aiTurnActiveRef.current = true;
        setMicEnabled(false);
      }
      // Fresh audio arrived → cancel any pending safety force-open.
      clearGateSafetyTimer();
      isAISpeakingRef.current = true;
      setIsAISpeaking(true);
      source.onended = () => {
        scheduledSourcesRef.current.delete(source);
        if (scheduledSourcesRef.current.size === 0) {
          // Queue drained — UI stops pulsing the "Speaking" dot.
          isAISpeakingRef.current = false;
          setIsAISpeaking(false);
          // If Gemini has already fired turnComplete, NOW is the right moment
          // to open the mic — tail audio has finished and won't echo back.
          if (turnEndedAwaitingDrainRef.current) {
            turnEndedAwaitingDrainRef.current = false;
            aiTurnActiveRef.current = false;
            setMicEnabled(true);
          } else {
            // turnComplete hasn't arrived yet. Arm a safety timer in case it
            // never does (model sometimes skips it); if a new chunk arrives
            // or turnComplete fires first, they cancel the timer.
            armGateSafetyTimer();
          }
        }
      };
    } catch (e) {
      console.error("[VoiceChat] Audio playback error:", e);
      if (scheduledSourcesRef.current.size === 0) {
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
      }
    }
  }, [armGateSafetyTimer, clearGateSafetyTimer, setMicEnabled]);

  // --- Disconnect / cleanup ---------------------------------------------

  const disconnect = useCallback(() => {
    disposedRef.current = true;
    setIsListening(false);
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    aiTurnActiveRef.current = false;
    turnEndedAwaitingDrainRef.current = false;
    clearGateSafetyTimer();
    stopAllPlayback();
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    try { wsRef.current?.close(); } catch { /* already closed */ }
    wsRef.current = null;
    connectingRef.current = false;
    if (inputContextRef.current && inputContextRef.current.state !== "closed") {
      inputContextRef.current.suspend().catch(() => {});
      inputContextRef.current.close().catch(() => {});
    }
    inputContextRef.current = null;
    if (outputContextRef.current && outputContextRef.current.state !== "closed") {
      outputContextRef.current.suspend().catch(() => {});
      outputContextRef.current.close().catch(() => {});
    }
    outputContextRef.current = null;
    setIsConnected(false);
  }, [clearGateSafetyTimer, stopAllPlayback]);

  // --- Mic toggle -------------------------------------------------------

  const toggleListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isListening) {
      processorRef.current?.disconnect();
      processorRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Prefer a 16 kHz AudioContext so we can send PCM directly; if the
      // browser refuses, fall back to the default rate and resample later.
      let ctx: AudioContext;
      try {
        ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      } catch {
        ctx = new AudioContext();
      }
      inputContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Anything above this RMS is treated as speech worth sending. Set low
      // enough that soft/far-from-mic voices (kids on a laptop) still pass.
      // With AGC on, typical quiet speech lands at ~0.005–0.015 RMS; 0.012
      // was dropping most of it, which is why Gemini never heard the student.
      const NOISE_FLOOR_RMS = 0.003;
      const srcRate = ctx.sampleRate;
      // Diagnostic: every ~2s, log mic state so we can see which gate (if any)
      // is blocking speech from reaching Gemini. Look at the "peakRms" — if
      // it's < 0.012 while you're speaking, your mic is too quiet for the
      // noise floor. If `wsReady=false` or `turnActive=true` you'll see that
      // here instead.
      let lastLogAt = 0;
      let peakRms = 0;
      let framesSent = 0;
      let framesBlocked = 0;

      processor.onaudioprocess = (e) => {
        const floatData = e.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < floatData.length; i++) sumSq += floatData[i] * floatData[i];
        const rms = Math.sqrt(sumSq / floatData.length);
        if (rms > peakRms) peakRms = rms;

        const now = performance.now();
        if (now - lastLogAt > 2000) {
          console.debug(
            `[VoiceChat mic] peakRms=${peakRms.toFixed(3)} sent=${framesSent} blocked=${framesBlocked} wsReady=${wsRef.current?.readyState === WebSocket.OPEN} turnActive=${aiTurnActiveRef.current}`,
          );
          peakRms = 0;
          framesSent = 0;
          framesBlocked = 0;
          lastLogAt = now;
        }

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (aiTurnActiveRef.current) { framesBlocked++; return; }
        if (rms < NOISE_FLOOR_RMS) { framesBlocked++; return; }

        // Resample to 16 kHz if the context sample rate didn't match.
        let resampled: Float32Array;
        if (Math.abs(srcRate - INPUT_SAMPLE_RATE) < 1) {
          resampled = floatData;
        } else {
          const ratio = srcRate / INPUT_SAMPLE_RATE;
          const outLen = Math.floor(floatData.length / ratio);
          resampled = new Float32Array(outLen);
          for (let i = 0; i < outLen; i++) {
            resampled[i] = floatData[Math.floor(i * ratio)];
          }
        }

        const pcm = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          pcm[i] = Math.max(-32768, Math.min(32767, Math.round(resampled[i] * 32767)));
        }
        const base64 = uint8ArrayToBase64(new Uint8Array(pcm.buffer));
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: base64 }],
          },
        }));
        framesSent++;
      };

      source.connect(processor);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      processor.connect(silent);
      silent.connect(ctx.destination);
      setIsListening(true);
      setError(null);
    } catch {
      setError("Microphone access denied. Please allow mic permissions and try again.");
    }
  }, [isListening]);

  // --- Connect ----------------------------------------------------------

  const connect = useCallback(async (autoListen = true) => {
    if (wsRef.current || connectingRef.current) {
      // The winning connect() already owns listening-state setup. We must
      // NOT call toggleListening() here — it's a toggle, not a setter, so
      // calling it twice (once from this early-return, once from the
      // winning sendSetup) ends up disabling the mic. Just bail.
      return;
    }
    // Flip the connecting flag synchronously — BEFORE any await — so a
    // concurrent connect() call (StrictMode, useCallback dep change) can't
    // slip past the guard while we're awaiting the Supabase session.
    connectingRef.current = true;
    disposedRef.current = false;
    setError(null);

    // Get the Supabase access token so the backend can authenticate the WS.
    let accessToken: string;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Not authenticated.");
        connectingRef.current = false;
        return;
      }
      accessToken = session.access_token;
    } catch (err) {
      console.error("[VoiceChat] auth error:", err);
      setError("Failed to get auth token.");
      connectingRef.current = false;
      return;
    }

    const backendHost = typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? `ws://${window.location.hostname}:8000`)
      : "ws://localhost:8000";
    const wsUrl = `${backendHost}/api/voice/gemini`;
    console.log("[VoiceChat] connecting to", wsUrl);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.error("[VoiceChat] WS constructor threw:", e);
      setError(`Couldn't open voice socket: ${e instanceof Error ? e.message : String(e)}`);
      connectingRef.current = false;
      return;
    }
    wsRef.current = ws;
    // wsRef is now the authoritative guard; release the pre-WS flag.
    connectingRef.current = false;
    console.log("[VoiceChat] WS created, readyState=", ws.readyState);
    // Auth happens as the first message so the URL stays short and we don't
    // hit browser/handshake edge cases with long JWTs in query strings.
    const pendingAuthRef = { current: accessToken };
    let authed = false;

    ws.onopen = () => {
      console.log("[VoiceChat] WS onopen — sending auth frame (token len=" + (pendingAuthRef.current?.length ?? 0) + ")");
      // Send auth as the first frame. The backend proxy authenticates the JWT
      // and replies with {authed: true}, after which we send setup + audio.
      ws.send(JSON.stringify({ auth: pendingAuthRef.current }));
    };

    const sendSetup = () => {
      if (authed) return;
      authed = true;
      setIsConnected(true);
      if (autoListen) toggleListening();

      const systemPrompt = buildSystemPrompt(optionsRef.current);
      // Bundle-freshness marker. If you don't see this line in the browser
      // console on connect, you're running a stale JS bundle — hard-refresh.
      console.log(
        "[VoiceChat] Gemini setup · model=preview-09-2025 · NO_INTERRUPTION · temp=0.2",
      );
      ws.send(JSON.stringify({
        setup: {
          model: GEMINI_MODEL,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: GEMINI_VOICE },
              },
            },
            // Low temperature → more deterministic, fewer hallucinated
            // facts, formulas, video IDs, or URLs.
            temperature: 0.2,
            // NOTE: `maxOutputTokens` looks tempting as a hard length cap
            // but Gemini Live truncates the audio stream mid-sentence when
            // the limit hits AND never emits turnComplete afterwards — so
            // the client's turn-state machine hangs, the mic stays gated,
            // and the user sees "tutor isn't speaking / not conversing".
            // Length is controlled by the system prompt instead.
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          // Gemini Live's inputAudioTranscription config does NOT accept
          // languageCode (tested 2026-04 → server returns
          //   "Unknown name \"languageCode\" at 'setup.input_audio_transcription'"
          // and 1007-closes the WS, which bricked connect entirely). Leave
          // the object empty and rely on the system prompt ("English only,
          // never Devanagari") to keep the transcript in Latin script.
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: TUTOR_TOOLS,
          // Turn-taking hardening: without NO_INTERRUPTION, speaker->mic
          // bleed makes Gemini's server VAD fire `interrupted` mid-sentence
          // and restart the response — the "Hello!Welcome toHello!" word-
          // salad. NO_INTERRUPTION keeps the AI's turn intact.
          //
          // VAD tuning — balance between snappy replies and not cutting
          // the student off mid-thought.
          //
          // First pass used endOfSpeechSensitivity=HIGH + 500ms silence,
          // which cut kids off during natural pauses ("uh… let me think…").
          // Dropped the HIGH sensitivity (back to model default — don't hunt
          // for turn-end more aggressively) and raised silence to 1000ms:
          // students get a full second of breathing room before the AI
          // decides they're done, which is ~500ms faster than the raw
          // default (~1500ms) but still forgiving of kid-style pauses.
          //
          // LOW sensitivity is still banned — tested 2026-04 it silently
          // disables response generation entirely on this model.
          realtimeInputConfig: {
            activityHandling: "NO_INTERRUPTION",
            automaticActivityDetection: {
              // 700 ms is the sweet spot after trial and error:
              //   500 ms cut kids off mid-pause ("uh... let me think...")
              //   1000 ms felt sluggish — 300 ms of dead air after every turn
              //   700 ms still tolerates natural thinking pauses but shaves
              //   a noticeable ~300 ms off student-finishes → AI-starts.
              silenceDurationMs: 700,
            },
          },
        },
      }));

      // Once setup is acknowledged (see onmessage), we send the opening prompt.
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      // Backend proxy finished auth → now send the Gemini setup frame.
      if (msg.authed === true) {
        sendSetup();
        return;
      }

      // Setup complete → send opening user message to kick off the lesson
      if ("setupComplete" in msg) {
        const opening = buildOpeningMessage(optionsRef.current);
        ws.send(JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text: opening }] }],
            turnComplete: true,
          },
        }));
        return;
      }

      // Tool call → fire the page's onToolCall handler and ack Gemini so it
      // doesn't stall waiting for a response.
      const toolCall = msg.toolCall as
        | { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }
        | undefined;
      if (toolCall?.functionCalls?.length) {
        // Dispatch every call synchronously, but ack each one individually
        // so a long-running tool (e.g. show_video, which we hold open until
        // the clip finishes) doesn't block shorter peers. Gemini is happy
        // to receive the toolResponse frames out-of-order relative to the
        // original call list, as long as each id matches.
        for (const call of toolCall.functionCalls) {
          const name = call.name ?? "";
          const args = call.args ?? {};
          const id = call.id ?? "";
          (async () => {
            try {
              const result = optionsRef.current.onToolCall?.(name, args);
              // If the handler returned a Promise, wait on it. For
              // show_video this is the clip's playback duration — Gemini
              // pauses its turn for the whole wait and resumes speaking
              // when we ack. A defensive 5-minute cap stops us from
              // deadlocking if the caller never resolves.
              if (result && typeof (result as Promise<void>).then === "function") {
                await Promise.race([
                  result as Promise<void>,
                  new Promise<void>((r) => setTimeout(r, 5 * 60 * 1000)),
                ]);
              }
            } catch (err) {
              console.error("[VoiceChat] onToolCall threw:", err);
            }
            if (id && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{ id, name, response: { result: "shown" } }],
                },
              }));
            }
          })();
        }
        return;
      }

      const serverContent = (msg.serverContent as Record<string, unknown> | undefined) ?? undefined;
      if (!serverContent) return;

      // Interruption: Gemini decided the user is speaking over the model.
      // Flush local audio AND drop the abandoned tutor line — otherwise the
      // next restart's transcription chunks append to the old partial line
      // and produce interleaved word-salad like "Hello!Welcome toHello!".
      if (serverContent.interrupted) {
        console.warn("[VoiceChat] Gemini fired `interrupted` — dropping partial line. If this happens repeatedly your NO_INTERRUPTION config isn't being applied; hard-refresh.");
        stopAllPlayback();
        const dropIdx = tutorLineIndexRef.current;
        if (dropIdx >= 0) {
          setTranscript((prev) =>
            dropIdx < prev.length ? prev.filter((_, i) => i !== dropIdx) : prev,
          );
        }
        tutorLineIndexRef.current = -1;
        studentLineIndexRef.current = -1;
        turnEndedAwaitingDrainRef.current = false;
      }

      // Streaming model audio
      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
      if (modelTurn?.parts && Array.isArray(modelTurn.parts)) {
        for (const part of modelTurn.parts as Array<Record<string, unknown>>) {
          const inlineData = part.inlineData as { mimeType?: string; data?: string } | undefined;
          if (inlineData?.data && typeof inlineData.data === "string") {
            playPcmChunk(base64ToUint8Array(inlineData.data));
          }
        }
      }

      // Live student transcription — APPEND deltas into the current "You:"
      // line. Gemini Live sends inputTranscription.text as incremental
      // fragments ("hello", " there", " how are you"), not as a cumulative
      // string. We were previously *replacing* the line on every event,
      // which displayed only the last fragment ("you") and hid the rest.
      //
      // Also filter out Devanagari: Gemini's auto language detect sometimes
      // latches onto Indian-accented English and emits Hindi script ("लाइन"
      // for "line"). The audio itself is still English, so Gemini's reply
      // stays correct — only the transcript is wrong. Skipping these
      // fragments keeps the chat pane clean.
      const inputTx = serverContent.inputTranscription as { text?: string } | undefined;
      if (inputTx?.text) {
        const delta = inputTx.text;
        const hasDevanagari = /[ऀ-ॿ]/.test(delta);
        if (!hasDevanagari) {
          setIsProcessingTranscript(true);
          setTranscript((prev) => {
            const idx = studentLineIndexRef.current;
            if (idx >= 0 && idx < prev.length) {
              const u = [...prev];
              u[idx] = u[idx] + delta;
              return u;
            }
            studentLineIndexRef.current = prev.length;
            tutorLineIndexRef.current = -1; // next tutor delta starts a new line
            return [...prev, `You: ${delta}`];
          });
        }
      }

      // Live tutor transcription — append to the current "Tutor: ..." line
      // UNLESS there's reason to believe a new thought is starting, in which
      // case start a fresh line. Three signals force a new line:
      //   1. Time gap since last chunk > 500 ms (paused mid-stream → new thought)
      //   2. Previous line ended with strong sentence terminator (`?` / `!`)
      //      and the new chunk starts with an uppercase greeting word —
      //      this catches the restart-loop merge.
      //   3. tutorLineIndexRef is -1 (standard case: turn just started).
      const outputTx = serverContent.outputTranscription as { text?: string } | undefined;
      if (outputTx?.text) {
        const now = Date.now();
        const gap = now - lastTutorChunkAtRef.current;
        lastTutorChunkAtRef.current = now;
        setTranscript((prev) => {
          const txt = outputTx.text!;
          const idx = tutorLineIndexRef.current;
          if (idx >= 0 && idx < prev.length) {
            const existing = prev[idx];
            const tail = existing.slice(-2).trim();
            const firstChar = txt.trimStart()[0] ?? "";
            const startNewLine =
              gap > 500 ||
              ((tail.endsWith("?") || tail.endsWith("!") || tail.endsWith(".")) &&
                /[A-Z]/.test(firstChar));
            if (!startNewLine) {
              const u = [...prev];
              u[idx] = existing + txt;
              return u;
            }
          }
          tutorLineIndexRef.current = prev.length;
          studentLineIndexRef.current = -1;
          return [...prev, `Tutor: ${txt}`];
        });
      }

      // Turn complete — reset line pointers so the next turn starts fresh.
      // The mic gate is released only after any tail audio finishes playing
      // (see onended). If the queue is already empty we can open it now.
      if (serverContent.turnComplete) {
        tutorLineIndexRef.current = -1;
        studentLineIndexRef.current = -1;
        setIsProcessingTranscript(false);
        clearGateSafetyTimer();
        if (scheduledSourcesRef.current.size === 0) {
          aiTurnActiveRef.current = false;
          turnEndedAwaitingDrainRef.current = false;
          setMicEnabled(true);
        } else {
          turnEndedAwaitingDrainRef.current = true;
        }
      }

      // Gemini signals the current response is generated (distinct from
      // turnComplete). Finalize the tutor line so any follow-up text from
      // the same turn starts fresh instead of concatenating.
      if (serverContent.generationComplete) {
        tutorLineIndexRef.current = -1;
        studentLineIndexRef.current = -1;
      }
    };

    ws.onerror = (evt) => {
      console.error("[VoiceChat] WS error event:", evt);
      setError("Voice connection failed. Check backend is running.");
    };

    ws.onclose = (evt) => {
      console.warn("[VoiceChat] WS closed", { code: evt.code, reason: evt.reason, wasClean: evt.wasClean });
      if (!evt.wasClean && evt.code !== 1000) {
        const reason = evt.reason || `code ${evt.code}`;
        setError(`Voice session closed: ${reason}. Check backend logs.`);
      }
      setIsConnected(false);
      setIsListening(false);
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
      wsRef.current = null;
      connectingRef.current = false;
    };
  }, [isListening, playPcmChunk, stopAllPlayback, toggleListening, setMicEnabled, clearGateSafetyTimer]);

  // Stub kept for API parity; sentiment injection can be wired back later.
  const injectSentimentContext = useCallback((_emotion: string, _confidence: number) => {
    // no-op under Gemini pass 1
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isAISpeaking,
    isProcessingTranscript,
    transcript,
    error,
    connect,
    disconnect,
    toggleListening,
    injectSentimentContext,
  };
}
