import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = "/api/proxy";

export interface SentimentData {
  emotion: string;
  confidence: number;
  action_taken: string | null;
}

export function useSentiment() {
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData | null>(null);
  const [history, setHistory] = useState<SentimentData[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const chapterIdRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async (chapterId: string) => {
    chapterIdRef.current = chapterId;

    // Subscribe to Supabase Realtime sentiment_logs table for this student
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Unsubscribe from previous subscription if any
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const subscription = supabase
        .channel(`sentiment:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sentiment_logs",
            filter: `student_id=eq.${user.id}`,
          },
          (payload: any) => {
            const log = payload.new;
            if (log.emotion && log.confidence !== undefined) {
              const sentiment: SentimentData = {
                emotion: log.emotion,
                confidence: log.confidence,
                action_taken: log.action_taken || null,
              };
              setCurrentSentiment(sentiment);
              setHistory((prev) => [...prev.slice(-49), sentiment]);
            }
          }
        )
        .subscribe();

      unsubscribeRef.current = () => {
        supabase.removeChannel(subscription);
      };
    } catch {
      // Realtime subscription is optional — proceed without it
    }
  }, []);

  const disconnect = useCallback(() => {
    chapterIdRef.current = null;
    pendingRef.current = false;
    setCurrentSentiment(null);
    setAnalyzing(false);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  /** Send a base64-encoded JPEG frame for live sentiment analysis via HTTP POST. */
  const sendFrame = useCallback(async (frameBase64: string, chapterId: string) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setAnalyzing(true);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${API_URL}/api/video/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          frame_base64: frameBase64,
          chapter_id: /^[0-9a-f-]{36}$/i.test(chapterId) ? chapterId : null,
        }),
      });

      if (res.ok) {
        const data: SentimentData = await res.json();
        if (data.emotion) {
          setCurrentSentiment(data);
          setHistory((prev) => [...prev.slice(-49), data]);
        }
      }
    } catch {
      // Silently degrade — sentiment is non-critical
    } finally {
      pendingRef.current = false;
      setAnalyzing(false);
    }
  }, []);

  return { currentSentiment, history, analyzing, connect, disconnect, sendFrame };
}
