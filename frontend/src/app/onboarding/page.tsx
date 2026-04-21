"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { name: "Mathematics", lessons: 24, color: "var(--subject-math)", bg: "var(--subject-math-bg)", icon: "➕" },
  { name: "Science", lessons: 20, color: "var(--subject-science)", bg: "var(--subject-science-bg)", icon: "🧪" },
  { name: "English", lessons: 18, color: "var(--subject-english)", bg: "var(--subject-english-bg)", icon: "📖" },
  { name: "History", lessons: 16, color: "var(--subject-history)", bg: "var(--subject-history-bg)", icon: "🏛️" },
  { name: "Computer Science", lessons: 22, color: "var(--subject-coding)", bg: "var(--subject-coding-bg)", icon: "💻" },
  { name: "Arts & Music", lessons: 14, color: "var(--subject-arts)", bg: "var(--subject-arts-bg)", icon: "🎨" },
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
  { bg: "#2563eb", fg: "#ffffff" },
  { bg: "#22c55e", fg: "#ffffff" },
  { bg: "#f97316", fg: "#ffffff" },
  { bg: "#a855f7", fg: "#ffffff" },
  { bg: "#ec4899", fg: "#ffffff" },
];

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

  const [avatarBg, setAvatarBg] = useState("#2563eb");
  const [avatarFg, setAvatarFg] = useState("#ffffff");
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
    const delays = [0, 900, 1800, 2700, 3600, 4500];
    let progress = 0;
    for (let i = 0; i < selectedSubjects.length; i++) {
      await new Promise((resolve) => {
        setTimeout(() => {
          progress = Math.round(((i + 1) / selectedSubjects.length) * 90);
          setGenProgress(progress);
          resolve(null);
        }, delays[i] + 700);
      });
    }
    setTimeout(() => setGenProgress(100), delays[selectedSubjects.length - 1] + 900);
    setTimeout(() => submitOnboarding(), delays[selectedSubjects.length - 1] + 1200);
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
      await apiPost("/onboarding", {
        name,
        grade: selectedGrade || "9",
        board: "CBSE",
        background: "Standard",
        interests: selectedSubjects,
      });
      goStep(5);
    } catch (err) {
      console.error("Onboarding submission failed:", err);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const STEPS = [
    { num: "1", name: "Create account", desc: "Name, email, password" },
    { num: "2", name: "Your profile", desc: "Photo & details" },
    { num: "3", name: "Select grade", desc: "K–12" },
    { num: "4", name: "Choose curriculum", desc: "Subjects & focus" },
    { num: "5", name: "Generating", desc: "AI builds your plan" },
    { num: "6", name: "Success", desc: "Ready to learn!" },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">
      {/* LEFT SIDEBAR */}
      <aside className="w-[260px] bg-white border-r border-[var(--border)] p-6 flex flex-col flex-shrink-0 shadow-card">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-2xl">💡</span>
          <span className="text-[18px] font-extrabold tracking-tight">
            <span className="text-[var(--text-primary)]">Learn</span>
            <span className="text-[var(--brand-blue)]">OS</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {STEPS.map((s, idx) => {
            const isDone = idx < step;
            const isActive = idx === step;
            return (
              <div key={idx} className="flex items-start gap-3 py-3">
                {isDone ? (
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-card">
                    ✓
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0",
                      isActive
                        ? "border-[var(--brand-blue)] text-[var(--brand-blue)] bg-[var(--brand-blue-soft)]"
                        : "border-[var(--border)] text-[var(--text-muted)] bg-white"
                    )}
                  >
                    {s.num}
                  </div>
                )}
                <div className="pt-0.5">
                  <div
                    className={cn(
                      "text-[13px] font-bold",
                      isDone
                        ? "text-[var(--accent)]"
                        : isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]"
                    )}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-start p-12 overflow-y-auto">
        {step === 0 && (
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">
              {isLogin ? "Welcome back 👋" : "Create your account 🚀"}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              {isLogin
                ? "Sign in to continue your learning journey"
                : "Start learning with a personalized AI curriculum"}
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-[var(--red-bg)] border border-[var(--red)] rounded-2xl text-[var(--red)] text-sm font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateInitials(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.02] transition-all shadow-card"
              >
                {isLogin ? "Sign in →" : "Create account →"}
              </button>
            </form>

            <div className="text-center text-sm text-[var(--text-muted)] mt-6">
              {isLogin ? "New here? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[var(--brand-blue)] hover:underline font-bold"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Set up your profile 🎨</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              This helps us personalise your learning experience
            </p>

            <div className="flex gap-5 mb-6 items-center bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-card"
                style={{ backgroundColor: avatarBg, color: avatarFg }}
              >
                {initials}
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-body)] mb-2">Choose an avatar color</div>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAvatarBg(color.bg);
                        setAvatarFg(color.fg);
                      }}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: avatarBg === color.bg ? "var(--text-primary)" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Date of birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">Gender (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Female"
                  className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">School name (optional)</label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Lincoln High School"
                className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-[var(--text-body)] mb-1.5 block">
                Parent / guardian email (optional)
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-blue)] transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => goStep(2)}
                className="flex-1 bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.02] transition-all shadow-card"
              >
                Continue →
              </button>
              <button
                onClick={() => goStep(2)}
                className="flex-1 bg-white border-2 border-[var(--border)] text-[var(--text-body)] py-3.5 rounded-full font-bold text-sm hover:bg-[var(--bg-deep)] transition-all"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-2xl">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">What grade are you in? 🎒</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">We'll tailor every lesson to your level</p>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-8">
              {GRADE_DATA.map((grade, i) => {
                const val = grade.value || "K";
                const selected = selectedGrade === val;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedGrade(val)}
                    className={cn(
                      "py-4 px-2 rounded-2xl text-center border-2 transition-all hover:-translate-y-0.5",
                      selected
                        ? "bg-[var(--brand-blue-soft)] border-[var(--brand-blue)] shadow-card"
                        : "bg-white border-[var(--border)] hover:border-[var(--brand-blue)]"
                    )}
                  >
                    <div className="text-[10px] text-[var(--text-muted)] font-semibold mb-1">{grade.label}</div>
                    <div
                      className={cn(
                        "text-lg font-extrabold",
                        selected ? "text-[var(--brand-blue)]" : "text-[var(--text-primary)]"
                      )}
                    >
                      {grade.num}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{grade.age}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goStep(3)}
              disabled={!selectedGrade}
              className="w-full bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-card"
            >
              Choose subjects →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-2xl">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Choose your curriculum 📚</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              Select the subjects you want to study. You can change this later.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {SUBJECTS.map((subj) => {
                const selected = selectedSubjects.includes(subj.name);
                return (
                  <button
                    key={subj.name}
                    onClick={() => toggleSubject(subj.name)}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all text-left hover:-translate-y-1",
                      selected
                        ? "shadow-elevated"
                        : "bg-white border-[var(--border)] shadow-card hover:border-[var(--brand-blue)]"
                    )}
                    style={
                      selected
                        ? { background: subj.bg, borderColor: subj.color }
                        : undefined
                    }
                  >
                    <div
                      className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center text-2xl text-white shadow-card"
                      style={{ background: subj.color }}
                    >
                      {subj.icon}
                    </div>
                    <div
                      className="text-sm font-extrabold"
                      style={{ color: selected ? subj.color : "var(--text-primary)" }}
                    >
                      {subj.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">{subj.lessons} lessons</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goStep(4)}
              disabled={selectedSubjects.length === 0}
              className="w-full bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-card"
            >
              Generate my curriculum →
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="w-full max-w-md text-center pt-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] flex items-center justify-center mx-auto mb-6 shadow-elevated">
              <span className="text-4xl">⚡</span>
            </div>

            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">Building your curriculum...</h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">Personalising lessons for Grade {selectedGrade || "9"}</p>

            <div className="h-3 bg-[var(--bg-deep)] rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand-blue)] rounded-full transition-all duration-500"
                style={{ width: `${genProgress}%` }}
              />
            </div>

            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-card mb-6 overflow-hidden">
              {selectedSubjects.map((subj, idx) => {
                const data = SUBJECTS.find((s) => s.name === subj);
                const done = genProgress > ((idx + 1) / selectedSubjects.length) * 90;
                return (
                  <div
                    key={subj}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm",
                      idx < selectedSubjects.length - 1 && "border-b border-[var(--border)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0",
                        done ? "bg-[var(--accent)]" : "bg-[var(--brand-blue)] animate-pulse"
                      )}
                    />
                    <span className="text-[var(--text-body)] font-semibold">{subj}</span>
                    <span className="ml-auto text-[var(--text-muted)] text-xs font-medium">
                      {done ? `${data?.lessons || 16} lessons` : "Generating…"}
                    </span>
                  </div>
                );
              })}
            </div>

            {genProgress >= 100 && (
              <button
                onClick={() => goStep(5)}
                className="w-full bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.01] transition-all shadow-card"
              >
                Start learning →
              </button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="w-full max-w-md text-center pt-6">
            <div className="w-20 h-20 rounded-3xl bg-[var(--green-bg)] border-2 border-[var(--green)] flex items-center justify-center mx-auto mb-6 shadow-card">
              <span className="text-4xl">🎉</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">
              You're all set, {name.split(" ")[0] || "learner"}!
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Your personalised curriculum is ready across {selectedSubjects.length} subjects
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {selectedSubjects.map((subj) => {
                const data = SUBJECTS.find((s) => s.name === subj);
                return (
                  <div
                    key={subj}
                    className="px-4 py-2 rounded-full text-xs font-bold border-2"
                    style={{
                      backgroundColor: data?.bg ?? "var(--brand-blue-soft)",
                      color: data?.color ?? "var(--brand-blue)",
                      borderColor: data?.color ?? "var(--brand-blue)",
                    }}
                  >
                    {subj}
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card mb-6 text-left">
              <div className="text-[11px] text-[var(--text-muted)] font-bold mb-3 tracking-widest uppercase">
                Your Plan
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Total lessons</span>
                <span className="text-[var(--text-primary)] font-extrabold">
                  {selectedSubjects.reduce((sum, subj) => {
                    const data = SUBJECTS.find((s) => s.name === subj);
                    return sum + (data?.lessons || 16);
                  }, 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Estimated weeks</span>
                <span className="text-[var(--text-primary)] font-extrabold">24 weeks</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-[var(--text-muted)]">AI tutor sessions</span>
                <span className="text-[var(--text-primary)] font-extrabold">Unlimited</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-[var(--accent)] text-white py-3.5 rounded-full font-bold text-sm hover:opacity-90 hover:scale-[1.01] transition-all shadow-card"
            >
              Go to my dashboard →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
