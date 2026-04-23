"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Byte, FloatingPixels } from "@/components/arcade";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div
      className="arcade-root"
      data-grade="68"
      data-motion="on"
      style={{ minHeight: "100vh" }}
    >
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
        <div
          className="gridbg"
          style={{ position: "absolute", inset: 0, opacity: 0.4 }}
        />
        <FloatingPixels count={18} />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 420,
            width: "100%",
            padding: 32,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                border: "3px solid #170826",
                display: "grid",
                placeItems: "center",
                boxShadow:
                  "0 5px 0 #170826, 0 0 20px rgba(255,62,165,0.5)",
                fontFamily: "var(--f-pixel)",
                fontSize: 20,
                color: "#fff",
              }}
            >
              L
            </div>
            <div className="h-display" style={{ fontSize: 26 }}>
              Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
            </div>
          </div>

          <div
            className="panel cyan"
            style={{ padding: 28, position: "relative", overflow: "hidden" }}
          >
            <div className="scanline" />

            {sent ? (
              <>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      margin: "0 auto 10px",
                      display: "inline-block",
                    }}
                  >
                    <Byte size={68} mood="happy" />
                  </div>
                  <div className="h-display" style={{ fontSize: 20 }}>
                    Check your email
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 4,
                    }}
                  >
                    A magic reset link is on its way
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: 16,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(166, 255, 59, 0.1)",
                    border: "2px solid var(--neon-lime)",
                    fontSize: 13,
                    color: "var(--ink)",
                    fontFamily: "var(--f-body)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "var(--ink-dim)",
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    Sent to
                  </div>
                  <div
                    style={{
                      color: "var(--neon-lime)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {email}
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    textAlign: "center",
                    marginBottom: 18,
                    lineHeight: 1.5,
                  }}
                >
                  Click the link in the email to set a new password. Check your
                  spam folder if you don&apos;t see it within a few minutes.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <button
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                    }}
                    className="pill"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "10px",
                      cursor: "pointer",
                    }}
                  >
                    Try a different email
                  </button>
                  <Link
                    href="/login"
                    className="chunky-btn cyan"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    ▶ Back to sign in
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      margin: "0 auto 12px",
                      display: "inline-block",
                    }}
                  >
                    <Byte size={72} mood="neutral" />
                  </div>
                  <div className="h-display" style={{ fontSize: 22 }}>
                    Lost the password?
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      marginTop: 4,
                    }}
                  >
                    Byte will send a reset link to your email
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

                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <label>
                    <div className="label" style={{ marginBottom: 6 }}>
                      Email address
                    </div>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="chunky-btn cyan"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: 4,
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Sending…" : "✉ Send Reset Link"}
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
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    style={{
                      color: "var(--neon-cyan)",
                      fontWeight: 700,
                      fontFamily: "var(--f-display)",
                      textDecoration: "none",
                    }}
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
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
