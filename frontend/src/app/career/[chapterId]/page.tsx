"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Briefcase, ChevronLeft, Sparkles } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

export default function CareerGlimpsePage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const { user, loading: authLoading } = useSupabaseAuth();
  const [glimpse, setGlimpse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/proxy/api/immersive/career-glimpse/${chapterId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGlimpse(data.glimpse);
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
        <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Looking up real-world careers…
      </div>
    );
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
            <Briefcase className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Where this shows up
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            A real-world glimpse of careers that use this topic.
          </p>
        </header>

        <section className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card">
          <p className="text-[var(--text-body)] text-[15px] leading-relaxed">
            {glimpse}
          </p>
        </section>
      </div>
    </div>
  );
}
