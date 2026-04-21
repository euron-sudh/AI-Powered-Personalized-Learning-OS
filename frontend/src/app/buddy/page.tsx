"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, Send, User } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Msg =
  | { role: "buddy"; text: string; expected?: string | null; correct?: boolean | null }
  | { role: "you"; text: string };

interface NextPrompt {
  type: "card" | "open";
  card_id?: string;
  buddy_says: string;
  hint?: string | null;
  topic?: string;
}

export default function StudyBuddyPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [current, setCurrent] = useState<NextPrompt | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }, []);

  const fetchNext = useCallback(async () => {
    setBusy(true);
    const headers = await auth();
    if (!headers) return;
    const res = await fetch("/api/proxy/api/buddy/next", { headers });
    setBusy(false);
    if (!res.ok) return;
    const data: NextPrompt = await res.json();
    setCurrent(data);
    setMessages((m) => [...m, { role: "buddy", text: data.buddy_says }]);
  }, [auth]);

  useEffect(() => {
    if (user && !authLoading && messages.length === 0) {
      setMessages([{ role: "buddy", text: "Hey! I'm your study buddy. Let's keep what you've learned sharp." }]);
      fetchNext();
    }
  }, [user, authLoading, fetchNext, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "you", text }]);
    setBusy(true);

    const headers = await auth();
    if (!headers) return;
    const body: Record<string, string> = { answer: text };
    if (current?.type === "card") body.card_id = current.card_id || "";
    else if (current?.type === "open") body.question = current.buddy_says;

    const res = await fetch("/api/proxy/api/buddy/answer", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setMessages((m) => [...m, { role: "buddy", text: "I lost the thread — try again?" }]);
      return;
    }
    const data = await res.json();
    setMessages((m) => [
      ...m,
      {
        role: "buddy",
        text: data.buddy_says,
        expected: data.expected ?? null,
        correct: data.correct ?? null,
      },
    ]);
    setCurrent(null);
    // Auto-fetch next after a short pause
    setTimeout(fetchNext, 700);
  }

  function reset() {
    setMessages([{ role: "buddy", text: "Fresh start! Let's go." }]);
    setCurrent(null);
    fetchNext();
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-6 px-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Bot className="w-6 h-6 text-[var(--brand-blue)]" strokeWidth={2} />
              Study Buddy
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              An AI partner that quizzes you on what you&rsquo;ve learned.
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> New session
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 bg-white border border-[var(--border)] rounded-2xl shadow-card p-5 overflow-y-auto space-y-3 min-h-[400px] max-h-[60vh]"
        >
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "you" && "flex-row-reverse")}>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-card",
                  m.role === "buddy"
                    ? "bg-[var(--brand-blue)] text-white"
                    : "bg-[var(--subject-coding)] text-white",
                )}
              >
                {m.role === "buddy" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed",
                  m.role === "buddy"
                    ? "bg-[var(--bg-deep)] text-[var(--text-body)]"
                    : "bg-[var(--brand-blue)] text-white",
                )}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.role === "buddy" && m.expected && m.correct === false && (
                  <div className="mt-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                    Expected: <span className="font-semibold">{m.expected}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-xs text-[var(--text-muted)] pl-10 italic">Buddy is thinking…</div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your answer…"
            className="flex-1 bg-white border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl px-5 text-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
