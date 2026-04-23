"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

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
      <div
        className="arcade-root"
        data-grade="68"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink)" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <ArcadeShell active="Learn" pixels={12}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => router.back()}
          className="pill"
          style={{ marginBottom: 14, cursor: "pointer", border: "2px solid var(--line)", background: "transparent", color: "var(--ink-dim)" }}
        >
          ← Back
        </button>

        <header style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <Byte size={56} />
          <div>
            <div className="label" style={{ color: "var(--neon-lime)", marginBottom: 4 }}>
              ✦ Future you
            </div>
            <h1 className="h-display" style={{ fontSize: 30, lineHeight: 1.1 }}>
              Where this shows up
            </h1>
            <p
              style={{
                color: "var(--ink-dim)",
                fontFamily: "var(--f-body)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              A real-world glimpse of careers that use this topic.
            </p>
          </div>
        </header>

        <section
          className="panel yel anim-glow"
          style={{ padding: 24, marginBottom: 18 }}
        >
          <div className="label" style={{ color: "var(--neon-yel)", marginBottom: 10 }}>
            ⚜ Career glimpse
          </div>
          <p
            style={{
              color: "var(--ink)",
              fontFamily: "var(--f-body)",
              fontSize: 15,
              lineHeight: 1.75,
            }}
          >
            {glimpse}
          </p>
        </section>

        <button
          onClick={() => router.push("/learn")}
          className="chunky-btn cyan"
          style={{ cursor: "pointer" }}
        >
          ▶ Explore a related quest
        </button>
      </div>
    </ArcadeShell>
  );
}
