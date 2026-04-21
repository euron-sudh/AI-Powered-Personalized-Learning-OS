"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Headphones, Sparkles } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
const VOICES: { id: Voice; label: string }[] = [
  { id: "nova", label: "Nova · warm" },
  { id: "alloy", label: "Alloy · neutral" },
  { id: "shimmer", label: "Shimmer · bright" },
  { id: "fable", label: "Fable · storyteller" },
  { id: "onyx", label: "Onyx · deep" },
  { id: "echo", label: "Echo · calm" },
];

export default function PodcastPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const { user, loading: authLoading } = useSupabaseAuth();
  const [voice, setVoice] = useState<Voice>("nova");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setAudioUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/proxy/api/immersive/podcast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chapter_id: chapterId, voice }),
      });
      if (!res.ok) {
        setErr("Podcast generation failed.");
        return;
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }, [chapterId, voice]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Back
        </button>

        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Headphones className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Listen to this chapter
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            A 60–90 second walkthrough, narrated for you.
          </p>
        </header>

        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
            Pick a voice
          </div>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                disabled={busy}
                className={cn(
                  "px-3 py-2 text-sm rounded-xl border transition-colors text-left",
                  voice === v.id
                    ? "bg-[var(--brand-blue)] border-[var(--brand-blue)] text-white font-semibold"
                    : "bg-white border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--bg-deep)]",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="mt-5 w-full bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2"
          >
            {busy ? (
              <><Sparkles className="w-4 h-4 animate-pulse" /> Recording your podcast…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {audioUrl ? "Regenerate" : "Generate podcast"}</>
            )}
          </button>

          {err && (
            <div className="mt-3 bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm rounded-xl px-4 py-2">
              {err}
            </div>
          )}
        </section>

        {audioUrl && (
          <section className="mt-5 bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
            <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
              Your podcast
            </div>
            <audio controls autoPlay src={audioUrl} className="w-full" />
            <a
              href={audioUrl}
              download={`chapter-${chapterId}.mp3`}
              className="mt-3 inline-block text-xs font-semibold text-[var(--brand-blue)]"
            >
              Download MP3
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
