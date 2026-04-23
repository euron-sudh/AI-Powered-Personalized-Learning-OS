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

// `gemini-2.0-flash-exp` was retired on the Live API in early 2026. The
// current native-audio Live model (which gives the warm conversational voice
// we want) is `gemini-2.5-flash-native-audio-latest`.
const GEMINI_MODEL = "models/gemini-2.5-flash-native-audio-latest";
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
          "Play a short educational video clip INLINE on the lesson stage. The video plays inside the lesson — students do NOT leave the app. The source is a YouTube ID under the hood, but rendered in a locked-down embed with no out-links. ONLY call with a real 11-character YouTube ID you remember from training; if unsure, SKIP — do not guess IDs. Prefer trimming to a short highlight using start_seconds and end_seconds (aim for 20–60s clips) so the student sees exactly the relevant part.",
        parameters: {
          type: "OBJECT",
          properties: {
            video_id: {
              type: "STRING",
              description: "11-character YouTube video ID (e.g. 'dQw4w9WgXcQ'), not a URL.",
            },
            title: { type: "STRING", description: "Short caption for the clip." },
            concept: {
              type: "STRING",
              description: "Which concept this clip illustrates (one phrase).",
            },
            start_seconds: {
              type: "NUMBER",
              description: "Optional start time in whole seconds to jump into the relevant part of the video.",
            },
            end_seconds: {
              type: "NUMBER",
              description: "Optional end time in whole seconds. Keep the clip short (20–60s).",
            },
          },
          required: ["video_id", "title"],
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
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
}

function buildSystemPrompt(opts: UseVoiceChatOptions): string {
  let s = "You are a patient, gentle AI tutor for K-12 students";
  if (opts.grade) s += ` in Grade ${opts.grade}`;
  if (opts.board) s += ` following the ${opts.board} curriculum`;
  s += ".\n\n";
  if (opts.subjectName) s += `Subject: ${opts.subjectName}\n`;
  if (opts.lessonTitle) s += `Current lesson: "${opts.lessonTitle}"\n`;
  if (opts.chapterDescription) s += `Lesson overview: ${opts.chapterDescription}\n`;
  if (opts.keyConcepts?.length)
    s += `\nKey concepts covered in this lesson:\n${opts.keyConcepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
  if (opts.summary) s += `\nLesson summary: ${opts.summary}\n`;
  s += `
Voice and delivery (CRITICAL):
- Speak calmly, clearly, and gently — like a warm, patient teacher.
- Steady, measured pace. Pause between sentences. Do not rush.
- Simple vocabulary. Short sentences. One idea per sentence.
- Never shout, sing, or do impressions. Keep an even, friendly tone.
- ALWAYS respond in English regardless of what language the student speaks.

Stay accurate — do NOT hallucinate (CRITICAL):
- Only discuss topics inside THIS lesson's scope. Redirect out-of-scope questions politely: "Great question — let's come back to it after this lesson."
- Never invent facts, dates, formulas, values, or quotes. If unsure, SAY "I'm not certain about that."
- If the student's audio was unclear, ask them to repeat — do NOT guess at what they said.
- Stay focused on the current lesson topic across the whole session.

Teaching approach (CRITICAL — this is a VOICE CONVERSATION, not a lecture):
- This is a BACK-AND-FORTH dialogue. You speak, then you STOP and wait for the student. Always.
- Every single response must end with EITHER a short question, OR an explicit invitation like "Does that make sense so far?" or "Want to try one?". Never end on a statement and keep going.
- Maximum TWO short sentences per turn. NEVER three in a row without pausing for the student.
- One idea per turn. Never cover two concepts in the same response.
- After a question, STOP speaking immediately. Do not continue with "so anyway" or "moving on".
- If the student says "I don't know", THEN give a real explanation — still two sentences, then re-invite.

Pacing rule enforcement:
- WRONG: "Let me explain line, shape, and form. Line is a path... Shape is a 2D area... Form is 3D... Any questions?" (too long, three concepts, one big wall)
- RIGHT: "A line is simply a path between two points. Can you picture one in your head?" (stops, waits)

Never monologue. If you catch yourself saying more than two sentences without a question, stop mid-thought and ask "still with me?"

Visual aids (you have tools — USE them naturally while teaching):
- show_diagram(mermaid_code, title, image_url?, image_alt?): best choice for processes, hierarchies, cycles, comparisons. Use simple flowchart/graph syntax. Call this often — diagrams are deterministic and safe. WHENEVER the concept has a concrete visual form (an art element like "line" or "color", a biological organism, a physical phenomenon, a historical artifact), ALSO pass image_url pointing to a real Wikimedia Commons image so students see both the structural diagram AND a real example side-by-side. Skeleton diagrams alone are hard to understand.
- show_video(video_id, title, concept?, start_seconds?, end_seconds?): Play a short illustrative clip INLINE on the lesson stage. The student never leaves the app. ONLY call with a real 11-char YouTube ID you remember; if unsure, SKIP. Always prefer a trimmed 20–60 second highlight via start_seconds/end_seconds so the student sees just the relevant moment, not the whole video.
- show_image(url, title, alt?): ONLY with a real, well-known public URL (Wikimedia Commons etc.). If in doubt, SKIP. Never invent URLs.

Safe image URLs: use full Wikimedia Commons URLs of the form "https://upload.wikimedia.org/wikipedia/commons/<path>" that you are CONFIDENT exist from pre-training. If you cannot recall a specific real URL, OMIT the image rather than guess.

How to use visuals:
- Briefly announce the visual in one short sentence ("Let me sketch this out for you."), THEN call the tool, THEN continue explaining. The visual replaces your avatar on the lesson stage while it's showing.
- At most one visual per concept — don't flood the screen.
- Prefer show_diagram over the other two; it's the safest.
`;
  return s;
}

function buildOpeningMessage(opts: UseVoiceChatOptions): string {
  if (opts.quizTopic) {
    return `I just took a practice quiz and got this question wrong: "${opts.quizTopic}". I chose "${opts.quizChosen ?? "something"}" but the correct answer is "${opts.quizCorrect ?? "(not given)"}". In TWO short sentences, tell me the core idea behind the right answer, then ask me a quick follow-up question and STOP. Don't keep explaining.`;
  }
  return "Greet me in ONE short sentence, then ask me ONE warm-up question about this lesson's topic and STOP speaking. Do NOT launch into the lesson yet. Wait for my answer first.";
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
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

  const stopAllPlayback = useCallback(() => {
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
  }, [setMicEnabled]);

  // Decode synchronously so chunks schedule in the exact order they arrive.
  // Going through `decodeAudioData` previously awaited per-chunk, and because
  // decodes of small chunks can resolve out of order the tutor ended up
  // talking in scrambled word fragments. Gemini Live sends raw little-endian
  // PCM16 at 24 kHz mono, so we can convert straight into an AudioBuffer.
  const playPcmChunk = useCallback((chunk: Uint8Array) => {
    if (disposedRef.current) return;
    try {
      const ctx = outputContextRef.current ?? new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      outputContextRef.current = ctx;
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
      const startAt = Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
      scheduledSourcesRef.current.add(source);
      if (!aiTurnActiveRef.current) {
        aiTurnActiveRef.current = true;
        setMicEnabled(false);
      }
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
  }, [setMicEnabled]);

  // --- Disconnect / cleanup ---------------------------------------------

  const disconnect = useCallback(() => {
    disposedRef.current = true;
    setIsListening(false);
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    aiTurnActiveRef.current = false;
    turnEndedAwaitingDrainRef.current = false;
    stopAllPlayback();
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    try { wsRef.current?.close(); } catch { /* already closed */ }
    wsRef.current = null;
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
  }, [stopAllPlayback]);

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

      const NOISE_FLOOR_RMS = 0.012;
      const srcRate = ctx.sampleRate;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        // Gate on TURN state, not queue state — see aiTurnActiveRef docstring.
        if (aiTurnActiveRef.current) return; // avoid speaker->mic loopback
        const floatData = e.inputBuffer.getChannelData(0);

        // Client-side amplitude gate — drops room hum, typing, distant chatter
        // before it ever reaches the server's VAD.
        let sumSq = 0;
        for (let i = 0; i < floatData.length; i++) sumSq += floatData[i] * floatData[i];
        const rms = Math.sqrt(sumSq / floatData.length);
        if (rms < NOISE_FLOOR_RMS) return;

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
    if (wsRef.current) {
      if (autoListen && !isListening) toggleListening();
      return;
    }
    disposedRef.current = false;
    setError(null);

    // Get the Supabase access token so the backend can authenticate the WS.
    let accessToken: string;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError("Not authenticated."); return; }
      accessToken = session.access_token;
    } catch (err) {
      console.error("[VoiceChat] auth error:", err);
      setError("Failed to get auth token.");
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
      return;
    }
    wsRef.current = ws;
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
        "[VoiceChat] Gemini setup · NO_INTERRUPTION ON · temp=0.3 · image_query tool on",
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
            temperature: 0.3,
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: TUTOR_TOOLS,
          // Turn-taking hardening: without NO_INTERRUPTION, speaker->mic
          // bleed makes Gemini's server VAD fire `interrupted` mid-sentence
          // and restart the response — the "Hello!Welcome toHello!" word-
          // salad. NO_INTERRUPTION keeps the AI's turn intact.
          //
          // Note: we deliberately do NOT set `automaticActivityDetection`
          // fields. Passing LOW sensitivities silently disables response
          // generation entirely on this model (tested 2026-04) — setupComplete
          // fires but no modelTurn frames ever arrive. Leave VAD at defaults.
          realtimeInputConfig: {
            activityHandling: "NO_INTERRUPTION",
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
        const responses: Array<{ id: string; name: string; response: Record<string, unknown> }> = [];
        for (const call of toolCall.functionCalls) {
          const name = call.name ?? "";
          const args = call.args ?? {};
          const id = call.id ?? "";
          try {
            optionsRef.current.onToolCall?.(name, args);
          } catch (err) {
            console.error("[VoiceChat] onToolCall threw:", err);
          }
          if (id) responses.push({ id, name, response: { result: "shown" } });
        }
        if (responses.length) {
          ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
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

      // Live student transcription — update the "You: ..." line in-place
      const inputTx = serverContent.inputTranscription as { text?: string } | undefined;
      if (inputTx?.text) {
        setIsProcessingTranscript(true);
        setTranscript((prev) => {
          const txt = `You: ${inputTx.text!}`;
          if (studentLineIndexRef.current >= 0 && studentLineIndexRef.current < prev.length) {
            const u = [...prev];
            u[studentLineIndexRef.current] = txt;
            return u;
          }
          studentLineIndexRef.current = prev.length;
          tutorLineIndexRef.current = -1; // next tutor delta starts a new line
          return [...prev, txt];
        });
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
    };
  }, [isListening, playPcmChunk, stopAllPlayback, toggleListening, setMicEnabled]);

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
