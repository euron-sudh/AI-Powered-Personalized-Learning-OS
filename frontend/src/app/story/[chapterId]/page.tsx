"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

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
      <div
        className="arcade-root"
        data-grade="68"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink)" }}
      >
        Loading…
      </div>
    );
  }

  if (err || !story) {
    return (
      <ArcadeShell active="Learn" pixels={10}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", placeItems: "center", gap: 16, paddingTop: 80 }}>
          <Byte size={80} mood="neutral" />
          <div className="panel mag" style={{ padding: 20, textAlign: "center" }}>
            <div className="label" style={{ marginBottom: 6 }}>Story Mode</div>
            <p style={{ color: "var(--ink)", fontFamily: "var(--f-body)", fontSize: 15 }}>
              {err ?? "No story available."}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="chunky-btn"
          >
            ← Go back
          </button>
        </div>
      </ArcadeShell>
    );
  }

  const total = story.scenes.length;
  const atEnd = idx >= total;
  const scene = !atEnd ? story.scenes[idx] : null;

  // Gradient palettes rotating per scene for the "art" placeholder
  const gradients = [
    "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
    "linear-gradient(135deg, var(--neon-cyan), var(--neon-vio))",
    "linear-gradient(135deg, var(--neon-yel), var(--neon-ora))",
    "linear-gradient(135deg, var(--neon-lime), var(--neon-cyan))",
    "linear-gradient(135deg, var(--neon-ora), var(--neon-mag))",
    "linear-gradient(135deg, var(--neon-vio), var(--neon-cyan))",
  ];
  const heroGrad = gradients[idx % gradients.length];

  return (
    <ArcadeShell active="Learn" pixels={14}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <button
          onClick={() => router.back()}
          className="pill"
          style={{ marginBottom: 14, cursor: "pointer", border: "2px solid var(--line)", background: "transparent", color: "var(--ink-dim)" }}
        >
          ← Back to lesson
        </button>

        <header style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <Byte size={56} />
          <div>
            <div className="label" style={{ color: "var(--neon-mag)", marginBottom: 4 }}>
              ✦ Story mode
            </div>
            <h1 className="h-display" style={{ fontSize: 30, lineHeight: 1.1 }}>
              {story.title}
            </h1>
          </div>
        </header>

        {/* Progress pips */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {story.scenes.map((_, i) => (
            <div
              key={i}
              style={{
                flex: i === idx ? 2 : 1,
                height: 8,
                borderRadius: 6,
                background:
                  i < idx
                    ? "var(--neon-cyan)"
                    : i === idx
                    ? "var(--neon-mag)"
                    : "rgba(255,255,255,0.08)",
                boxShadow:
                  i <= idx
                    ? `0 0 10px ${i === idx ? "var(--neon-mag)" : "var(--neon-cyan)"}`
                    : "none",
                transition: "all 400ms ease",
              }}
            />
          ))}
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 6,
              background: atEnd ? "var(--neon-yel)" : "rgba(255,255,255,0.08)",
              boxShadow: atEnd ? "0 0 10px var(--neon-yel)" : "none",
            }}
          />
        </div>

        {scene ? (
          <>
            {/* Hero art panel */}
            <div
              className="panel cyan anim-float"
              style={{
                padding: 0,
                overflow: "hidden",
                marginBottom: 16,
                height: 200,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: heroGrad,
                  opacity: 0.85,
                }}
              />
              <div
                className="gridbg"
                style={{ position: "absolute", inset: 0, opacity: 0.3 }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  padding: 20,
                }}
              >
                <div
                  className="pixel anim-bop"
                  style={{
                    fontFamily: "var(--f-pixel)",
                    fontSize: 56,
                    color: "#fff",
                    textShadow: "0 0 20px rgba(0,0,0,0.6), 4px 4px 0 #170826",
                  }}
                >
                  {idx + 1}
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  padding: "4px 10px",
                  borderRadius: 10,
                  background: "rgba(23,8,38,0.8)",
                  border: "2px solid var(--ink)",
                }}
                className="label"
              >
                Scene {idx + 1} of {total}
              </div>
            </div>

            <article className="panel" style={{ padding: 24, minHeight: 240 }}>
              <h2
                className="h-display"
                style={{ fontSize: 22, marginBottom: 12, color: "var(--neon-cyan)" }}
              >
                {scene.heading}
              </h2>
              <p
                style={{
                  color: "var(--ink)",
                  fontFamily: "var(--f-body)",
                  fontSize: 15,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {scene.narrative}
              </p>
              <div
                className="panel yel"
                style={{ marginTop: 18, padding: 14 }}
              >
                <div className="label" style={{ color: "var(--neon-yel)", marginBottom: 4 }}>
                  ✦ The concept
                </div>
                <p style={{ color: "var(--ink)", fontFamily: "var(--f-body)", fontSize: 14 }}>
                  {scene.concept}
                </p>
              </div>
            </article>
          </>
        ) : (
          <article className="panel mag anim-glow" style={{ padding: 28, minHeight: 240 }}>
            <div className="label" style={{ color: "var(--neon-mag)", marginBottom: 8 }}>
              ✦ The moral
            </div>
            <p
              style={{
                color: "var(--ink)",
                fontFamily: "var(--f-body)",
                fontSize: 16,
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              {story.moral}
            </p>
            <Link
              href={`/learn`}
              className="chunky-btn cyan"
              style={{ marginTop: 22, display: "inline-block", textDecoration: "none" }}
            >
              ▶ Back to Learn
            </Link>
          </article>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="pill"
            style={{
              cursor: idx === 0 ? "not-allowed" : "pointer",
              opacity: idx === 0 ? 0.35 : 1,
              border: "2px solid var(--line)",
              background: "transparent",
              color: "var(--ink)",
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(total, i + 1))}
            disabled={atEnd}
            className="chunky-btn cyan"
            style={{
              cursor: atEnd ? "not-allowed" : "pointer",
              opacity: atEnd ? 0.4 : 1,
            }}
          >
            {idx === total - 1 ? "Moral" : "Next"} →
          </button>
        </div>
      </div>
    </ArcadeShell>
  );
}
