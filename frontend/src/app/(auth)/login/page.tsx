"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Byte, FloatingPixels } from "@/components/arcade";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arcade-root" data-grade="68" data-motion="on" data-mascot="on" style={{ minHeight: "100vh" }}>
      <main
        className="screen"
        style={{
          minHeight: "100vh",
          position: "relative",
          display: "grid",
          placeItems: "center",
          borderRadius: 0,
          border: "none",
        }}
      >
        <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <FloatingPixels count={22} />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            maxWidth: 900,
            padding: 40,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                  border: "3px solid #170826",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 6px 0 #170826, 0 0 24px rgba(255,62,165,0.5)",
                  fontFamily: "var(--f-pixel)",
                  fontSize: 24,
                  color: "#fff",
                }}
              >
                L
              </div>
              <div className="h-display" style={{ fontSize: 32 }}>
                Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
              </div>
            </div>
            <h1 className="h-display" style={{ fontSize: 52, lineHeight: 1.02, marginBottom: 18 }}>
              School, but <span style={{ color: "var(--neon-yel)" }}>fun</span>.<br />
              Press <span style={{ color: "var(--neon-mag)" }}>start</span> to play.
            </h1>
            <p style={{ color: "var(--ink-dim)", fontSize: 16, maxWidth: 380 }}>
              Quests, boss battles, and a tiny buddy named Byte. Grades K–12.
            </p>
            <div style={{ display: "flex", gap: 18, marginTop: 28 }}>
              {[
                { k: "Players", v: "2.4M" },
                { k: "Quests", v: "50k+" },
                { k: "Buddies", v: "∞" },
              ].map((s) => (
                <div key={s.k}>
                  <div className="h-display" style={{ fontSize: 24, color: "var(--neon-cyan)" }}>
                    {s.v}
                  </div>
                  <div className="label">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="panel cyan"
            style={{ padding: 32, position: "relative", overflow: "hidden" }}
          >
            <div className="scanline" />
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ margin: "0 auto 12px", display: "inline-block" }}>
                <Byte size={72} />
              </div>
              <div className="h-display" style={{ fontSize: 22 }}>
                Welcome back, hero
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                Sign in to resume your quest
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255, 62, 165, 0.12)",
                  border: "2px solid var(--neon-mag)",
                  color: "var(--neon-mag)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="pill"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                cursor: "pointer",
                marginBottom: 14,
                opacity: googleLoading || loading ? 0.6 : 1,
              }}
            >
              <GoogleIcon />
              <span style={{ marginLeft: 8 }}>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </span>
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--ink-mute)",
                fontSize: 11,
                marginBottom: 14,
              }}
            >
              <div style={{ flex: 1, height: 2, background: "var(--line-soft)" }} />
              <span className="label" style={{ fontSize: 10 }}>or sign in with email</span>
              <div style={{ flex: 1, height: 2, background: "var(--line-soft)" }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label>
                <div className="label" style={{ marginBottom: 6 }}>Email</div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  style={inputStyle}
                />
              </label>
              <label>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span className="label">Password</span>
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: 11,
                      color: "var(--neon-cyan)",
                      fontFamily: "var(--f-display)",
                      fontWeight: 700,
                    }}
                  >
                    Forgot?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--ink-mute)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                        <path d="M2 8.5s2.5-4.5 6.5-4.5 6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5S2 8.5 2 8.5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
                        <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                        <path d="M2 2l13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                        <path d="M2 8.5s2.5-4.5 6.5-4.5 6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5S2 8.5 2 8.5z" stroke="currentColor" strokeWidth="1.3" fill="none" />
                        <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="chunky-btn"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 8,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Signing in…" : "▶ Press Start"}
              </button>
            </form>

            <p
              style={{
                textAlign: "center",
                marginTop: 18,
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              New here?{" "}
              <Link
                href="/register"
                style={{
                  color: "var(--neon-cyan)",
                  fontWeight: 700,
                  fontFamily: "var(--f-display)",
                }}
              >
                Create your player
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "2px solid var(--line)",
  background: "rgba(0,0,0,0.35)",
  color: "var(--ink)",
  fontFamily: "var(--f-body)",
  fontSize: 14,
  outline: "none",
};
