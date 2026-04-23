"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";
import { ArcadeShell, Byte, FloatingPixels } from "@/components/arcade";

const SUBJECTS = [
  { name: "Mathematics", lessons: 24, color: "var(--s-math)", icon: "∑" },
  { name: "Science", lessons: 20, color: "var(--s-sci)", icon: "⚛" },
  { name: "English", lessons: 18, color: "var(--s-eng)", icon: "A" },
  { name: "History", lessons: 16, color: "var(--s-his)", icon: "⚜" },
  { name: "Computer Science", lessons: 22, color: "var(--s-cs)", icon: "</>" },
  { name: "Arts & Music", lessons: 14, color: "var(--s-art)", icon: "✦" },
];

const GRADE_DATA = [
  { label: "Kindergarten", num: "K", age: "Age 5–6" },
  { label: "Grade", num: "1st", age: "Age 6–7", value: "1" },
  { label: "Grade", num: "2nd", age: "Age 7–8", value: "2" },
  { label: "Grade", num: "3rd", age: "Age 8–9", value: "3" },
  { label: "Grade", num: "4th", age: "Age 9–10", value: "4" },
  { label: "Grade", num: "5th", age: "Age 10–11", value: "5" },
  { label: "Grade", num: "6th", age: "Age 11–12", value: "6" },
  { label: "Grade", num: "7th", age: "Age 12–13", value: "7" },
  { label: "Grade", num: "8th", age: "Age 13–14", value: "8" },
  { label: "Grade", num: "9th", age: "Age 14–15", value: "9" },
  { label: "Grade", num: "10th", age: "Age 15–16", value: "10" },
  { label: "Grade", num: "11th", age: "Age 16–17", value: "11" },
  { label: "Grade", num: "12th", age: "Age 17–18", value: "12" },
];

const AVATAR_COLORS = [
  { bg: "#27e0ff", fg: "#0b0716" },
  { bg: "#ff3ea5", fg: "#ffffff" },
  { bg: "#ffe53d", fg: "#170826" },
  { bg: "#a6ff3b", fg: "#0b0716" },
  { bg: "#9b5cff", fg: "#ffffff" },
];

// Arcade neon input style
const arcadeInputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "2px solid var(--line)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  color: "var(--ink)",
  fontFamily: "var(--f-body)",
  outline: "none",
};

const arcadeLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--f-display)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1,
  color: "var(--neon-cyan)",
  textTransform: "uppercase",
  marginBottom: 6,
};

function ByteTooltip({ text }: { text: string }) {
  return (
    <div className="anim-float" style={{ position: "relative" }}>
      <Byte size={200} />
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -80,
          background: "var(--neon-yel)",
          color: "#170826",
          padding: "10px 14px",
          borderRadius: 14,
          border: "3px solid #170826",
          fontWeight: 800,
          fontSize: 13,
          boxShadow: "0 4px 0 #170826",
          transform: "rotate(4deg)",
          maxWidth: 220,
        }}
      >
        {text}
        <div
          style={{
            position: "absolute",
            bottom: -8,
            left: 20,
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "10px solid #170826",
          }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [step, setStep] = useState(0);
  const [isLogin, setIsLogin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");

  const [avatarBg, setAvatarBg] = useState("#27e0ff");
  const [avatarFg, setAvatarFg] = useState("#0b0716");
  const [initials, setInitials] = useState("?");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState(["Mathematics", "Science", "English"]);
  const [genProgress, setGenProgress] = useState(0);

  const updateInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const init = parts.map((p) => p[0] || "").join("").toUpperCase().slice(0, 2) || "?";
    setInitials(init);
    setName(fullName);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/proxy/api/onboarding/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          if (!cancelled && profile?.onboarding_completed) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch { /* fall through to skip auth form */ }
      if (cancelled) return;
      setStep((s) => (s === 0 ? 1 : s));
      const fullName = user.user_metadata?.full_name;
      if (fullName) updateInitials(fullName);
      else if (user.email && !name) updateInitials(user.email.split("@")[0]);
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (password !== confirmPassword) return setAuthError("Passwords do not match");
        if (password.length < 8) return setAuthError("Password must be at least 8 characters");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthError(
            "Account created. Check your email to confirm, then return here to continue."
          );
          return;
        }
        goStep(1);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  const goStep = (n: number) => {
    setStep(n);
    if (n === 4) startGeneration();
  };

  const startGeneration = async () => {
    setGenProgress(0);
    const stepDelay = 600;
    for (let i = 0; i < selectedSubjects.length; i++) {
      await new Promise((resolve) => {
        setTimeout(() => {
          setGenProgress(Math.round(((i + 1) / selectedSubjects.length) * 90));
          resolve(null);
        }, stepDelay);
      });
    }
    setGenProgress(100);
    submitOnboarding();
  };

  const submitOnboarding = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setAuthError("Your session expired. Please sign in to finish onboarding.");
        setStep(0);
        setIsLogin(true);
        return;
      }
      await apiPost("/api/onboarding", {
        name,
        grade: selectedGrade || "9",
        board: "CBSE",
        background: "Standard",
        interests: selectedSubjects,
      });
      goStep(5);
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not save onboarding: ${msg}\n\nPlease try again.`);
      setStep(3);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const TOTAL_STEPS = 6;
  const displayStepIdx = step; // 0..5 for the 6-segment progress bar

  return (
    <ArcadeShell active={undefined as any} pixels={20} showTopBar={false}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Segmented top progress bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 30 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 4,
                background: i <= displayStepIdx ? "var(--neon-cyan)" : "rgba(255,255,255,0.08)",
                boxShadow: i <= displayStepIdx ? "0 0 10px var(--neon-cyan)" : "none",
                border: "2px solid " + (i <= displayStepIdx ? "var(--neon-cyan)" : "var(--line-soft)"),
              }}
            />
          ))}
        </div>

        {/* STEP 0 — Create account / Sign in */}
        {step === 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 1 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 44, margin: "10px 0 14px" }}>
                {isLogin ? (
                  <>
                    Welcome <span style={{ color: "var(--neon-cyan)" }}>back</span>!
                  </>
                ) : (
                  <>
                    Create your <span style={{ color: "var(--neon-mag)" }}>hero</span>
                    <br />
                    account
                  </>
                )}
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 20, maxWidth: 460 }}>
                {isLogin
                  ? "Sign in to continue your learning quest."
                  : "Start learning with a personalised AI curriculum."}
              </p>

              {authError && (
                <div
                  role="alert"
                  style={{
                    marginBottom: 16,
                    padding: "12px 14px",
                    background: "rgba(255, 62, 165, 0.12)",
                    border: "2px solid var(--neon-mag)",
                    borderRadius: 12,
                    color: "var(--neon-mag)",
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: "0 0 12px rgba(255,62,165,0.35)",
                  }}
                >
                  {authError}
                </div>
              )}

              <form
                onSubmit={handleAuth}
                style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460 }}
              >
                <div>
                  <label style={arcadeLabelStyle}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={arcadeInputStyle}
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label style={arcadeLabelStyle}>Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateInitials(e.target.value)}
                      placeholder="Your full name"
                      required
                      style={arcadeInputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={arcadeLabelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    style={arcadeInputStyle}
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label style={arcadeLabelStyle}>Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      style={arcadeInputStyle}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
                  <button type="submit" className="chunky-btn cyan" style={{ cursor: "pointer" }}>
                    {isLogin ? "Sign in ▶" : "Create account ▶"}
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setIsLogin(!isLogin)}
                    style={{ cursor: "pointer" }}
                  >
                    {isLogin ? "New here? Sign up" : "Have an account? Sign in"}
                  </button>
                </div>
              </form>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text={isLogin ? "Welcome back, hero!" : "Let's suit you up!"} />
              <div className="panel" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Meet</div>
                <div className="h-display" style={{ fontSize: 20, margin: "4px 0" }}>
                  Byte, your buddy
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  I&apos;ll quiz you, cheer you on, and never judge a mistake. Ready to roll?
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Profile */}
        {step === 1 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 2 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 44, margin: "10px 0 14px" }}>
                Set up your <span style={{ color: "var(--neon-mag)" }}>profile</span>
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 20, maxWidth: 460 }}>
                This helps us personalise your learning experience.
              </p>

              <div
                className="panel cyan"
                style={{
                  display: "flex",
                  gap: 18,
                  alignItems: "center",
                  padding: 18,
                  marginBottom: 16,
                  maxWidth: 460,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--f-display)",
                    fontWeight: 900,
                    fontSize: 22,
                    backgroundColor: avatarBg,
                    color: avatarFg,
                    border: "3px solid #170826",
                    boxShadow: `0 4px 0 #170826, 0 0 14px ${avatarBg}`,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div style={{ ...arcadeLabelStyle, marginBottom: 8 }}>Choose an avatar color</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {AVATAR_COLORS.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAvatarBg(color.bg);
                          setAvatarFg(color.fg);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          cursor: "pointer",
                          backgroundColor: color.bg,
                          border: "2px solid " + (avatarBg === color.bg ? "#ffffff" : "#170826"),
                          boxShadow: `0 3px 0 #170826, 0 0 10px ${color.bg}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ maxWidth: 460 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={arcadeLabelStyle}>Date of birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={arcadeInputStyle}
                    />
                  </div>
                  <div>
                    <label style={arcadeLabelStyle}>Gender (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Female"
                      style={arcadeInputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={arcadeLabelStyle}>School name (optional)</label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="e.g. Lincoln High School"
                    style={arcadeInputStyle}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={arcadeLabelStyle}>Parent / guardian email (optional)</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    style={arcadeInputStyle}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="chunky-btn cyan"
                    onClick={() => goStep(2)}
                    style={{ cursor: "pointer" }}
                  >
                    Continue ▶
                  </button>
                  <button
                    className="pill"
                    onClick={() => goStep(2)}
                    style={{ cursor: "pointer" }}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text="Lookin' cool! Pick a colour that's *you*." />
              <div className="panel" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Profile Tip</div>
                <div className="h-display" style={{ fontSize: 18, margin: "4px 0" }}>
                  Make it yours
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  Your avatar shows up in lessons, leaderboards, and high-fives. Everything here is optional.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Grade picker */}
        {step === 2 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 3 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 44, margin: "10px 0 14px" }}>
                What <span style={{ color: "var(--neon-cyan)" }}>grade</span> are you in?
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 24, maxWidth: 500 }}>
                We&apos;ll tailor every lesson to your level.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 10,
                  marginBottom: 24,
                  maxWidth: 560,
                }}
              >
                {GRADE_DATA.map((grade, i) => {
                  const val = grade.value || "K";
                  const selected = selectedGrade === val;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedGrade(val)}
                      style={{
                        padding: "12px 6px",
                        borderRadius: 12,
                        textAlign: "center",
                        background: selected ? "rgba(39,224,255,0.15)" : "rgba(0,0,0,0.3)",
                        border: "3px solid " + (selected ? "var(--neon-cyan)" : "var(--line)"),
                        boxShadow: selected
                          ? "0 4px 0 #170826, 0 0 16px var(--neon-cyan)"
                          : "0 4px 0 #170826",
                        color: "var(--ink)",
                        cursor: "pointer",
                        transform: selected ? "translateY(-2px)" : "none",
                        fontFamily: "var(--f-body)",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--ink-dim)",
                          fontFamily: "var(--f-display)",
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                        }}
                      >
                        {grade.label}
                      </div>
                      <div
                        className="h-display"
                        style={{
                          fontSize: 18,
                          color: selected ? "var(--neon-cyan)" : "var(--ink)",
                          textShadow: selected ? "0 0 10px var(--neon-cyan)" : "none",
                          margin: "2px 0",
                        }}
                      >
                        {grade.num}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-dim)", fontWeight: 600 }}>{grade.age}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="pill" onClick={() => goStep(1)} style={{ cursor: "pointer" }}>
                  ← Back
                </button>
                <button
                  className="chunky-btn cyan"
                  onClick={() => goStep(3)}
                  disabled={!selectedGrade}
                  style={{
                    cursor: selectedGrade ? "pointer" : "not-allowed",
                    opacity: selectedGrade ? 1 : 0.45,
                  }}
                >
                  Choose subjects ▶
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text="Pick your level — I'll scale with you!" />
              <div className="panel" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Why we ask</div>
                <div className="h-display" style={{ fontSize: 18, margin: "4px 0" }}>
                  Right-size lessons
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  Grade tells us which skills to unlock first. You can always level up or down later.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Subjects */}
        {step === 3 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 4 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 44, margin: "10px 0 14px" }}>
                Which <span style={{ color: "var(--neon-mag)" }}>worlds</span>
                <br />
                spark your brain?
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 20, maxWidth: 460 }}>
                Pick your favourites. Byte will build your first quest path from them. You can change this anytime.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  maxWidth: 520,
                  marginBottom: 22,
                }}
              >
                {SUBJECTS.map((subj) => {
                  const selected = selectedSubjects.includes(subj.name);
                  return (
                    <button
                      key={subj.name}
                      onClick={() => toggleSubject(subj.name)}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background: selected ? `${subj.color}22` : "rgba(0,0,0,0.3)",
                        border: "3px solid " + (selected ? subj.color : "var(--line)"),
                        boxShadow: selected
                          ? `0 4px 0 #170826, 0 0 18px ${subj.color}`
                          : "0 4px 0 #170826",
                        color: "var(--ink)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        transform: selected ? "translateY(-2px)" : "none",
                        transition: "all 120ms ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 30,
                          color: subj.color,
                          textShadow: `0 0 14px ${subj.color}`,
                          fontFamily: "var(--f-display)",
                          fontWeight: 900,
                        }}
                      >
                        {subj.icon}
                      </div>
                      <div className="h-display" style={{ fontSize: 13, textAlign: "center" }}>
                        {subj.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--ink-dim)",
                          fontFamily: "var(--f-display)",
                          fontWeight: 700,
                        }}
                      >
                        {subj.lessons} lessons
                      </div>
                      {selected && (
                        <div
                          style={{
                            fontSize: 10,
                            color: subj.color,
                            fontFamily: "var(--f-display)",
                            fontWeight: 900,
                          }}
                        >
                          ✓ PICKED
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="pill" onClick={() => goStep(2)} style={{ cursor: "pointer" }}>
                  ← Back
                </button>
                <button
                  className="chunky-btn cyan"
                  onClick={() => goStep(4)}
                  disabled={selectedSubjects.length === 0}
                  style={{
                    cursor: selectedSubjects.length === 0 ? "not-allowed" : "pointer",
                    opacity: selectedSubjects.length === 0 ? 0.45 : 1,
                  }}
                >
                  Generate curriculum ▶
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text="You got this, new hero!" />
              <div className="panel" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Meet</div>
                <div className="h-display" style={{ fontSize: 20, margin: "4px 0" }}>
                  Byte, your buddy
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  I&apos;ll quiz you, cheer you on, and never judge a mistake. Ready to roll?
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Generation */}
        {step === 4 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 5 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 40, margin: "10px 0 14px" }}>
                Building your <span style={{ color: "var(--neon-cyan)" }}>curriculum</span>…
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 22, maxWidth: 460 }}>
                Personalising lessons for Grade {selectedGrade || "9"}.
              </p>

              {/* Big progress bar */}
              <div
                style={{
                  height: 16,
                  background: "rgba(0,0,0,0.35)",
                  border: "2px solid var(--line)",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 22,
                  maxWidth: 460,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${genProgress}%`,
                    background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-mag))",
                    boxShadow: "0 0 14px var(--neon-cyan)",
                    transition: "width 450ms ease",
                  }}
                />
              </div>

              <div
                className="panel"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  marginBottom: 22,
                  maxWidth: 460,
                }}
              >
                {selectedSubjects.map((subj, idx) => {
                  const data = SUBJECTS.find((s) => s.name === subj);
                  const done = genProgress > ((idx + 1) / selectedSubjects.length) * 90;
                  return (
                    <div
                      key={subj}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom:
                          idx < selectedSubjects.length - 1 ? "1px solid var(--line-soft)" : "none",
                        fontSize: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          flexShrink: 0,
                          background: done ? "var(--neon-lime)" : (data?.color ?? "var(--neon-cyan)"),
                          boxShadow: `0 0 8px ${done ? "var(--neon-lime)" : (data?.color ?? "var(--neon-cyan)")}`,
                          animation: done ? undefined : "pulse 1.2s ease-in-out infinite",
                        }}
                      />
                      <span style={{ color: "var(--ink)", fontWeight: 700 }}>{subj}</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          color: "var(--ink-dim)",
                          fontSize: 12,
                          fontFamily: "var(--f-display)",
                          fontWeight: 700,
                        }}
                      >
                        {done ? `${data?.lessons || 16} lessons` : "Generating…"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {genProgress >= 100 && (
                <button
                  className="chunky-btn cyan"
                  onClick={() => goStep(5)}
                  style={{ cursor: "pointer" }}
                >
                  Start learning ▶
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text="Crunching pixels… almost there!" />
              <div className="panel mag" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Status</div>
                <div className="h-display" style={{ fontSize: 24, margin: "4px 0" }}>
                  {genProgress}%
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  AI is laying out your quest path across {selectedSubjects.length} worlds.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Success */}
        {step === 5 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                Step 6 of {TOTAL_STEPS}
              </span>
              <h1 className="h-display" style={{ fontSize: 44, margin: "10px 0 14px" }}>
                You&apos;re all set,{" "}
                <span style={{ color: "var(--neon-lime)" }}>
                  {name.split(" ")[0] || "hero"}
                </span>
                !
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginBottom: 20, maxWidth: 460 }}>
                Your personalised curriculum is ready across {selectedSubjects.length} subjects.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
                {selectedSubjects.map((subj) => {
                  const data = SUBJECTS.find((s) => s.name === subj);
                  const color = data?.color ?? "var(--neon-cyan)";
                  return (
                    <div
                      key={subj}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        background: `${color}22`,
                        color,
                        border: `2px solid ${color}`,
                        fontFamily: "var(--f-display)",
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        boxShadow: `0 0 10px ${color}`,
                      }}
                    >
                      {subj}
                    </div>
                  );
                })}
              </div>

              <div className="panel" style={{ padding: 18, marginBottom: 22, maxWidth: 460 }}>
                <div className="label" style={{ marginBottom: 10 }}>Your plan</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line-soft)",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--ink-dim)" }}>Total lessons</span>
                  <span
                    className="h-display"
                    style={{ color: "var(--neon-cyan)", textShadow: "0 0 8px var(--neon-cyan)" }}
                  >
                    {selectedSubjects.reduce((sum, subj) => {
                      const data = SUBJECTS.find((s) => s.name === subj);
                      return sum + (data?.lessons || 16);
                    }, 0)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line-soft)",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--ink-dim)" }}>Estimated weeks</span>
                  <span
                    className="h-display"
                    style={{ color: "var(--neon-yel)", textShadow: "0 0 8px var(--neon-yel)" }}
                  >
                    24 weeks
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--ink-dim)" }}>AI tutor sessions</span>
                  <span
                    className="h-display"
                    style={{ color: "var(--neon-lime)", textShadow: "0 0 8px var(--neon-lime)" }}
                  >
                    Unlimited
                  </span>
                </div>
              </div>

              <button
                className="chunky-btn cyan"
                onClick={() => router.push("/dashboard")}
                style={{ cursor: "pointer" }}
              >
                Go to my dashboard ▶
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <ByteTooltip text="LET'S GOOOO! Quest unlocked." />
              <div className="panel yel" style={{ padding: 18, maxWidth: 320, textAlign: "center" }}>
                <div className="label">Ready</div>
                <div className="h-display" style={{ fontSize: 22, margin: "4px 0" }}>
                  Press start!
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                  Your dashboard is warmed up and your first quest is waiting for you.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* tiny pulse keyframes used by generating list dots */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.9); }
        }
      `}</style>
    </ArcadeShell>
  );
}
