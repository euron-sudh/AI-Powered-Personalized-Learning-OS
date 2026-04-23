"use client";

import { useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

interface ScanResult {
  problem: string;
  subject: string;
  steps: string[];
  final_answer: string;
  concept: string;
}

export default function ScanDoubtPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("Please choose an image.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setErr("Image too large (max 8MB).");
      return;
    }
    setErr(null);
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function scan() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErr("Please sign in.");
        return;
      }
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/proxy/api/immersive/scan-doubt", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        setErr(`Scan failed: ${t.slice(0, 200)}`);
        return;
      }
      setResult(await res.json());
    } catch (e: any) {
      setErr(e.message || "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setErr(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (authLoading || !user) {
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
    <ArcadeShell active="Learn" pixels={16}>
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Byte size={64} mood="happy" />
          <div>
            <div className="pill" style={{ marginBottom: 8 }}>
              <span style={{ color: "var(--neon-cyan)" }}>◈</span> DOUBT SCANNER
            </div>
            <h1 className="h-display" style={{ fontSize: 32, margin: 0 }}>
              Snap it. <span style={{ color: "var(--neon-cyan)" }}>Solve it.</span>
            </h1>
            <p className="label" style={{ marginTop: 6 }}>
              Upload a homework photo — Byte breaks it down step by step.
            </p>
          </div>
        </header>

        {/* Upload zone */}
        {!preview && (
          <label
            className="panel anim-float"
            style={{
              display: "block",
              padding: 40,
              textAlign: "center",
              cursor: "pointer",
              border: "2px dashed var(--neon-cyan)",
              boxShadow: "0 0 24px rgba(39,224,255,0.25), inset 0 0 24px rgba(39,224,255,0.08)",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
            <div
              style={{
                fontSize: 56,
                lineHeight: 1,
                color: "var(--neon-cyan)",
                textShadow: "0 0 18px var(--neon-cyan)",
                marginBottom: 14,
              }}
            >
              ⇪
            </div>
            <div
              className="h-display"
              style={{ fontSize: 22, color: "var(--ink)", marginBottom: 6 }}
            >
              Tap to snap or upload
            </div>
            <div className="label">JPG or PNG · up to 8MB</div>
          </label>
        )}

        {/* Preview */}
        {preview && (
          <div className="panel" style={{ padding: 16 }}>
            <div
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                border: "2px solid var(--line)",
                background: "#0a0515",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Problem"
                style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }}
              />
              {/* scanline overlay */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "repeating-linear-gradient(0deg, rgba(39,224,255,0.06) 0px, rgba(39,224,255,0.06) 1px, transparent 1px, transparent 3px)",
                }}
              />
              <button
                onClick={reset}
                aria-label="Remove"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "2px solid #170826",
                  background: "var(--neon-mag)",
                  color: "#170826",
                  fontWeight: 900,
                  fontFamily: "var(--f-display)",
                  cursor: "pointer",
                  boxShadow: "0 3px 0 0 #170826",
                }}
              >
                ✕
              </button>
            </div>

            {!result && (
              <button
                onClick={scan}
                disabled={busy}
                className="chunky-btn cyan"
                style={{
                  width: "100%",
                  marginTop: 16,
                  opacity: busy ? 0.6 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "READING PROBLEM…" : "✦ SOLVE IT FOR ME"}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {err && (
          <div
            className="panel mag"
            style={{
              padding: 14,
              color: "var(--ink)",
              fontFamily: "var(--f-body)",
              fontSize: 14,
            }}
          >
            <span className="label" style={{ color: "var(--neon-mag)", marginRight: 8 }}>
              ERROR
            </span>
            {err}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Subject + problem */}
            <section className="panel" style={{ padding: 20 }}>
              <div className="label" style={{ color: "var(--neon-yel)", marginBottom: 8 }}>
                {result.subject}
              </div>
              <p style={{ margin: 0, color: "var(--ink)", fontSize: 14, lineHeight: 1.55 }}>
                {result.problem}
              </p>
            </section>

            {/* Walkthrough */}
            <section className="panel cyan" style={{ padding: 20 }}>
              <div
                className="h-display"
                style={{ fontSize: 16, color: "var(--neon-cyan)", marginBottom: 14 }}
              >
                ▶ WALKTHROUGH
              </div>
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {result.steps.map((s, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        flex: "0 0 32px",
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: "var(--neon-cyan)",
                        color: "#170826",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--f-display)",
                        fontWeight: 900,
                        fontSize: 14,
                        border: "2px solid #170826",
                        boxShadow: "0 3px 0 0 #170826",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p style={{ margin: 0, color: "var(--ink)", fontSize: 14, lineHeight: 1.55, paddingTop: 4 }}>
                      {s}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Final answer */}
            <section className="panel yel anim-glow" style={{ padding: 20 }}>
              <div className="label" style={{ color: "var(--neon-yel)", marginBottom: 8 }}>
                ✔ FINAL ANSWER
              </div>
              <p
                className="h-display"
                style={{ margin: 0, fontSize: 24, color: "var(--ink)" }}
              >
                {result.final_answer}
              </p>
            </section>

            {/* Concept */}
            <section className="panel mag" style={{ padding: 20 }}>
              <div className="label" style={{ color: "var(--neon-mag)", marginBottom: 8 }}>
                ✦ KEY CONCEPT
              </div>
              <p style={{ margin: 0, color: "var(--ink)", fontSize: 14, lineHeight: 1.55 }}>
                {result.concept}
              </p>
            </section>

            <button onClick={reset} className="chunky-btn lime" style={{ width: "100%" }}>
              ↻ SCAN ANOTHER
            </button>
          </div>
        )}
      </div>
    </ArcadeShell>
  );
}
