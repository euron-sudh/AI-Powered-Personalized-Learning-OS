import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";

export interface TutorSessionState {
  sessionId: string;
  studentId: string;
  chapterId: string;
  topic: string;
  stage: string;
  emotion: string;
  mastery: number;
  confusionCount: number;
  engagementScore: number;
}

export interface TutorEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export function useTutorSession(chapterId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<TutorSessionState | null>(null);
  const [events, setEvents] = useState<TutorEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastEmotionRef = useRef<{ emotion: string; time: number } | null>(null);
  const channelRef = useRef<any>(null);

  // Push emotion to trigger state machine step
  const pushEmotion = useCallback(
    async (emotion: string, confidence: number) => {
      if (!sessionId) return;

      // Debounce: don't re-push same emotion within 60s
      const now = Date.now();
      if (
        lastEmotionRef.current?.emotion === emotion &&
        now - lastEmotionRef.current.time < 60000
      ) {
        return;
      }

      lastEmotionRef.current = { emotion, time: now };

      try {
        await apiPost("/api/tutor-session/emotion", {
          session_id: sessionId,
          emotion,
          confidence,
        });
      } catch (err) {
        console.error("Failed to push emotion:", err);
      }
    },
    [sessionId]
  );

  // Auto-start session when component mounts or chapterId changes
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!chapterId) return;
      setLoading(true);
      setError(null);

      try {
        const response = await apiPost<{ session_id: string }>(
          "/api/tutor-session/start",
          { chapter_id: chapterId, topic: "" }
        );

        if (!mounted) return;

        const newSessionId = response.session_id;
        setSessionId(newSessionId);

        // Initialize Realtime listener for events
        if (newSessionId) {
          const channel = supabase
            .channel(`tutor-events:${newSessionId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "tutor_events",
                filter: `session_id=eq.${newSessionId}`,
              },
              (payload: any) => {
                if (payload.eventType === "INSERT" && payload.new) {
                  const event: TutorEvent = {
                    id: payload.new.id,
                    eventType: payload.new.event_type,
                    payload: payload.new.payload,
                    createdAt: payload.new.created_at,
                  };
                  setEvents((prev) => [...prev, event]);
                }
              }
            )
            .subscribe();

          channelRef.current = channel;
        }
      } catch (err) {
        if (mounted) {
          setError(`Failed to start session: ${err}`);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [chapterId]);

  return {
    sessionId,
    sessionState,
    events,
    loading,
    error,
    pushEmotion,
  };
}
