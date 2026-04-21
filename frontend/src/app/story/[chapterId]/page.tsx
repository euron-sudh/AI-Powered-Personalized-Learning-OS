"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Scene {
  heading: string;
  narrative: string;
  concept: string;
}

interface Story {
  title: string;
  scenes: Scene[];
  moral: string;
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const { user, loading: authLoading } = useSupabaseAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/proxy/api/immersive/story/${chapterId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setErr("Story could not be generated.");
      } else {
        setStory(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (user && !authLoading) load();
  }, [user, authLoading, load]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] text-sm text-[var(--text-muted)]">
        <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Weaving your story…
      </div>
    );
  }

  if (err || !story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-deep)] gap-3">
        <p className="text-sm text-[var(--text-body)]">{err ?? "No story available."}</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold text-[var(--brand-blue)]"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const total = story.scenes.length;
  const atEnd = idx >= total;
  const scene = !atEnd ? story.scenes[idx] : null;

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> Back to lesson
        </button>

        <header className="mb-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--brand-blue)] mb-2">
            <BookOpen className="w-4 h-4" /> Story mode
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] leading-tight">
            {story.title}
          </h1>
        </header>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {story.scenes.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i < idx ? "flex-1 bg-[var(--brand-blue)]" :
                i === idx ? "flex-[2] bg-[var(--brand-blue)]" :
                "flex-1 bg-[var(--border)]",
              )}
            />
          ))}
          <div className={cn(
            "h-1.5 rounded-full transition-all flex-1",
            atEnd ? "bg-[var(--brand-blue)]" : "bg-[var(--border)]",
          )} />
        </div>

        {scene ? (
          <article className="bg-white border border-[var(--border)] rounded-2xl p-7 shadow-card min-h-[320px]">
            <div className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
              Scene {idx + 1} of {total}
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">
              {scene.heading}
            </h2>
            <p className="text-[var(--text-body)] text-[15px] leading-relaxed whitespace-pre-wrap">
              {scene.narrative}
            </p>
            <div className="mt-5 bg-[var(--brand-blue-soft)] border-l-4 border-[var(--brand-blue)] rounded-r-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--brand-blue)] mb-0.5">
                The concept
              </div>
              <p className="text-sm text-[var(--text-body)]">{scene.concept}</p>
            </div>
          </article>
        ) : (
          <article className="bg-white border border-[var(--border)] rounded-2xl p-7 shadow-card min-h-[320px]">
            <div className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
              The moral
            </div>
            <p className="text-[var(--text-body)] text-[15px] leading-relaxed italic">
              {story.moral}
            </p>
            <Link
              href={`/learn`}
              className="mt-6 inline-block bg-[var(--brand-blue)] hover:opacity-90 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
            >
              Back to Learn
            </Link>
          </article>
        )}

        <div className="mt-5 flex justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-body)] disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(total, i + 1))}
            disabled={atEnd}
            className="flex items-center gap-1 bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl px-4 py-2 text-sm"
          >
            {idx === total - 1 ? "Moral" : "Next"} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
