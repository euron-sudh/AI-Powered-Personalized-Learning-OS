import { useCallback, useRef, useState } from "react";

const API_URL = "/api/proxy";
const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");

export interface SentimentData {
  emotion: string;
  confidence: number;
  action_taken: string | null;
}

export function useSentiment() {
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData | null>(null);
  const [history, setHistory] = useState<SentimentData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const chapterIdRef = useRef<string | null>(null);
  // Prevent sending a new frame before the previous analysis response arrives
  const pendingRef = useRef(false);

  const connect = useCallback(async (chapterId: string) => {
    chapterIdRef.current = chapterId;
    if (wsRef.current) return; // already connected

    try {
      const { supabase } = await import("@/lib/supabase");
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const { data } = await supabase.auth.refreshSession();
        session = data.session;
      }
      if (!session?.access_token) return;

      const ws = new WebSocket(
        `${WS_URL}/api/video/sentiment/ws?token=${encodeURIComponent(session.access_token)}`
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        pendingRef.current = false;
        setAnalyzing(false);
        try {
          const data: SentimentData = JSON.parse(event.data as string);
          if (data.emotion) {
            setCurrentSentiment(data);
            setHistory((prev) => [...prev.slice(-49), data]);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        pendingRef.current = false;
        setAnalyzing(false);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Silently degrade — sentiment is non-critical
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    chapterIdRef.current = null;
    pendingRef.current = false;
    setCurrentSentiment(null);
    setAnalyzing(false);
  }, []);

  /** Send a base64-encoded JPEG frame for live sentiment analysis. */
  const sendFrame = useCallback((frameBase64: string, chapterId: string) => {
    if (pendingRef.current) return; // skip — previous frame still being analyzed
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    pendingRef.current = true;
    setAnalyzing(true);
    wsRef.current.send(
      JSON.stringify({
        frame_base64: frameBase64,
        chapter_id: /^[0-9a-f-]{36}$/i.test(chapterId) ? chapterId : null,
      })
    );
  }, []);

  return { currentSentiment, history, analyzing, connect, disconnect, sendFrame };
}
