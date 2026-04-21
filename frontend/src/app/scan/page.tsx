"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Lightbulb, Sparkles, Upload, X } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

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
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Camera className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Doubt scanner
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Snap a homework problem, get a step-by-step walkthrough.
          </p>
        </header>

        {!preview && (
          <label className="block bg-white border-2 border-dashed border-[var(--border)] hover:border-[var(--brand-blue)] rounded-2xl p-10 text-center cursor-pointer transition-colors">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
            <Upload className="w-8 h-8 mx-auto text-[var(--brand-blue)] mb-3" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Tap to take a photo or upload
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              JPG or PNG, up to 8MB
            </p>
          </label>
        )}

        {preview && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Problem"
                className="rounded-xl w-full max-h-96 object-contain bg-[var(--bg-deep)]"
              />
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-card"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!result && (
              <button
                onClick={scan}
                disabled={busy}
                className="w-full mt-4 bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2"
              >
                {busy ? (
                  <><Sparkles className="w-4 h-4 animate-pulse" /> Reading the problem…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Solve it for me</>
                )}
              </button>
            )}
          </div>
        )}

        {err && (
          <div className="mt-4 bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm rounded-xl px-4 py-3">
            {err}
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">
                {result.subject}
              </div>
              <p className="text-sm text-[var(--text-body)]">{result.problem}</p>
            </section>

            <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
              <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
                Walkthrough
              </div>
              <ol className="space-y-3">
                {result.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-[var(--text-body)] leading-relaxed">{s}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="bg-[var(--brand-blue-soft)] border border-[var(--brand-blue)] rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--brand-blue)] mb-2">
                <CheckCircle2 className="w-4 h-4" /> Final answer
              </div>
              <p className="text-lg font-extrabold text-[var(--text-primary)]">
                {result.final_answer}
              </p>
            </section>

            <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
                <Lightbulb className="w-4 h-4 text-[var(--subject-english)]" /> Key concept
              </div>
              <p className="text-sm text-[var(--text-body)]">{result.concept}</p>
            </section>

            <button
              onClick={reset}
              className="w-full bg-white border border-[var(--border)] hover:bg-[var(--bg-deep)] text-[var(--text-body)] font-semibold rounded-xl py-3 text-sm"
            >
              Scan another problem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
