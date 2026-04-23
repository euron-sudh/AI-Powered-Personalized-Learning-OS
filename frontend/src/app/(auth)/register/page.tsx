"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleGoogleSignUp() {
    setError(null);
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      setLoading(false);
      return;
    }
    router.push("/onboarding");
  }

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResendMsg(error ? "Failed to resend. Please try again." : "Confirmation email resent! Check your inbox.");
  }

  function Frame({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        data-motion="on"
        data-mascot="on"
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
          <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
          <FloatingPixels count={20} />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: 460,
              padding: 32,
            }}
          >
            {children}
          </div>
        </main>
      </div>
    );
  }

  if (emailSent) {
    return (
      <Frame>
        <div className="panel cyan" style={{ padding: 32, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
          <h1 className="h-display" style={{ fontSize: 26, marginBottom: 8 }}>Check your email</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, marginBottom: 4 }}>
            We sent a confirmation link to
          </p>
          <p
            style={{
              color: "var(--neon-cyan)",
              fontFamily: "var(--f-display)",
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            {email}
          </p>
          <p style={{ color: "var(--ink-mute)", fontSize: 12, marginBottom: 22 }}>
            Click the link in the email to activate your account, then come back to sign in. Check your spam folder if you don&apos;t see it.
          </p>

          {resendMsg && (
            <p
              style={{
                fontSize: 12,
                marginBottom: 14,
                color: resendMsg.includes("resent") ? "var(--neon-lime)" : "var(--neon-mag)",
                fontWeight: 700,
              }}
            >
              {resendMsg}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleResend}
              disabled={resending}
              className="pill"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                cursor: "pointer",
                opacity: resending ? 0.6 : 1,
              }}
            >
              {resending ? "Resending…" : "Resend confirmation email"}
            </button>
            <Link
              href="/login"
              className="chunky-btn cyan"
              style={{ justifyContent: "center", textDecoration: "none" }}
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
              border: "3px solid #170826",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 6px 0 #170826, 0 0 24px rgba(255,62,165,0.5)",
              fontFamily: "var(--f-pixel)",
              fontSize: 22,
              color: "#fff",
            }}
          >
            L
          </div>
          <div className="h-display" style={{ fontSize: 28 }}>
            Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
          </div>
        </div>
      </div>

      <div
        className="panel cyan"
        style={{ padding: 28, position: "relative", overflow: "hidden" }}
      >
        <div className="scanline" />
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-block", marginBottom: 10 }}>
            <Byte size={64} />
          </div>
          <h1 className="h-display" style={{ fontSize: 22 }}>Create your player</h1>
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
            Join LearnOS — it&apos;s free
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
          onClick={handleGoogleSignUp}
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
          <span className="label" style={{ fontSize: 10 }}>or register with email</span>
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
            <div className="label" style={{ marginBottom: 6 }}>Password</div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={inputStyle}
            />
          </label>
          <label>
            <div className="label" style={{ marginBottom: 6 }}>Confirm password</div>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
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
            {loading ? "Creating account…" : "▶ Create Account"}
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
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--neon-cyan)", fontWeight: 700, fontFamily: "var(--f-display)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </Frame>
  );
}
