"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";

const SUBJECTS = [
  { name: "Mathematics", lessons: 24, pill: "pill-math" },
  { name: "Science", lessons: 20, pill: "pill-sci" },
  { name: "English", lessons: 18, pill: "pill-eng" },
  { name: "History", lessons: 16, pill: "pill-hist" },
  { name: "Computer Science", lessons: 22, pill: "pill-math" },
  { name: "Arts & Music", lessons: 14, pill: "pill-sci" },
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

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const [step, setStep] = useState(0);
  const [isLogin, setIsLogin] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);

  // Step 0: Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");

  // Step 1: Profile
  const [avatarBg, setAvatarBg] = useState("#3d3faa");
  const [avatarFg, setAvatarFg] = useState("#a8aaee");
  const [initials, setInitials] = useState("?");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  // Step 2: Grade
  const [selectedGrade, setSelectedGrade] = useState("");

  // Step 3: Curriculum
  const [selectedSubjects, setSelectedSubjects] = useState(["Mathematics", "Science", "English"]);

  // Step 4: Generation
  const [genProgress, setGenProgress] = useState(0);

  // If user is authenticated but just logged in (not signed up), send to dashboard
  useEffect(() => {
    if (user && isLogin) {
      router.push("/dashboard");
    }
  }, [user, isLogin, router]);

  const updateInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    const initials = parts.map((p) => p[0] || "").join("").toUpperCase().slice(0, 2) || "?";
    setInitials(initials);
    setName(fullName);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setIsLogin(true);
      } else {
        if (password !== confirmPassword) {
          setAuthError("Passwords do not match");
          return;
        }
        if (password.length < 8) {
          setAuthError("Password must be at least 8 characters");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setJustSignedUp(true);
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

    setTimeout(() => {
      setGenProgress(100);
    }, delays[selectedSubjects.length - 1] + 900);

    setTimeout(() => {
      submitOnboarding();
    }, delays[selectedSubjects.length - 1] + 1200);
  };

  const submitOnboarding = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

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
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const avatarColors = [
    { bg: "#3d3faa", fg: "#a8aaee" },
    { bg: "#0f3d2a", fg: "#1d9e75" },
    { bg: "#2d1a1a", fg: "#e24b4a" },
    { bg: "#1f1a0f", fg: "#ef9f27" },
  ];

  return (
    <div className="bg-[#0d1117] min-h-screen flex">
      {/* LEFT SIDEBAR */}
      <div className="w-[220px] bg-[#0a0d14] border-r border-[#1a1f2e] p-6 flex flex-col flex-shrink-0">
        <div className="text-[18px] font-[500] text-white mb-12 tracking-tight">
          Learn<span className="text-[#5b5eff]">OS</span>
        </div>

        <div className="flex flex-col gap-0">
          {[
            { num: "1", name: "Create account", desc: "Name, email, password" },
            { num: "2", name: "Your profile", desc: "Photo & details" },
            { num: "3", name: "Select grade", desc: "K–12" },
            { num: "4", name: "Choose curriculum", desc: "Subjects & focus" },
            { num: "5", name: "Generating", desc: "AI builds your plan" },
            { num: "6", name: "Success", desc: "Ready to learn!" },
          ].map((s, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-[12px] pb-8 relative ${
                idx < step ? "done" : idx === step ? "active" : ""
              }`}
              style={{
                borderBottom: idx < 5 ? "1px solid #1a1f2e" : "none",
              }}
            >
              {idx < step && (
                <svg
                  className="w-7 h-7 text-[#a8aaee] flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {idx >= step && (
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    idx === step
                      ? "border-[#5b5eff] text-[#a8aaee] bg-[#1a1f35]"
                      : "border-[#1a1f2e] text-[#6b7280] bg-[#0a0d14]"
                  }`}
                >
                  {s.num}
                </div>
              )}
              <div className="pt-1">
                <div
                  className={`text-[12px] font-[500] ${
                    idx < step ? "text-[#a8aaee]" : idx === step ? "text-[#c5c9d6]" : "text-[#6b7280]"
                  }`}
                >
                  {s.name}
                </div>
                <div className="text-[11px] text-[#3a3f55] mt-1">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-start p-12 overflow-y-auto">
        {step === 0 && (
          <div className="w-full max-w-[420px]">
            <h1 className="text-[20px] font-[500] text-white mb-2">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">
              {isLogin
                ? "Sign in to continue your learning journey"
                : "Start learning with a personalized AI curriculum"}
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-[#e24b4a]/10 border border-[#e24b4a]/20 rounded-lg text-[#e24b4a] text-[12px]">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateInitials(e.target.value)}
                    placeholder="Your full name"
                    required={!isLogin}
                    className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
                  />
                </div>
              )}

              <div>
                <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required={!isLogin}
                    className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] transition"
              >
                {isLogin ? "Sign in →" : "Create account →"}
              </button>
            </form>

            <div className="text-center text-[12px] text-[#6b7280] mt-6">
              {isLogin ? "New here? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#a8aaee] hover:text-white cursor-pointer font-[500]"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-[420px]">
            <h1 className="text-[20px] font-[500] text-white mb-2">Set up your profile</h1>
            <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">
              This helps us personalise your learning experience
            </p>

            <div className="flex gap-4 mb-6 items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-[500]"
                style={{ backgroundColor: avatarBg, color: avatarFg }}
              >
                {initials}
              </div>
              <div>
                <div className="text-[12px] text-[#6b7280] mb-2 font-[500]">
                  Choose an avatar color
                </div>
                <div className="flex gap-2">
                  {avatarColors.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAvatarBg(color.bg);
                        setAvatarFg(color.fg);
                      }}
                      className="w-6 h-6 rounded-full border-2 transition"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: avatarBg === color.bg ? color.fg : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] focus:outline-none focus:border-[#5b5eff]"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                  Gender (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Female"
                  className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                School name (optional)
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Lincoln High School"
                className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
              />
            </div>

            <div className="mb-6">
              <label className="text-[12px] text-[#6b7280] font-[500] mb-1 block">
                Parent / guardian email (optional)
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full bg-[#161b27] border border-[#1e2330] rounded-[8px] px-3 py-2.5 text-[13px] text-[#c5c9d6] placeholder-[#3a3f55] focus:outline-none focus:border-[#5b5eff]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => goStep(2)}
                className="flex-1 bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] transition"
              >
                Continue →
              </button>
              <button
                onClick={() => goStep(2)}
                className="flex-1 bg-transparent border border-[#1e2330] text-[#6b7280] py-3 rounded-[8px] text-[13px] hover:bg-[#1a1f2e] transition"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-[420px]">
            <h1 className="text-[20px] font-[500] text-white mb-2">What grade are you in?</h1>
            <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">
              We'll tailor every lesson to your level
            </p>

            <div className="grid grid-cols-4 gap-2 mb-6">
              {GRADE_DATA.map((grade, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedGrade(grade.value || "K")}
                  className={`py-3 px-2 rounded-[10px] text-center border transition ${
                    selectedGrade === (grade.value || "K")
                      ? "bg-[#1a1f35] border-[#5b5eff]"
                      : "bg-[#161b27] border-[#1e2330] hover:border-[#3d3faa] hover:bg-[#1a1f2e]"
                  }`}
                >
                  <div className="text-[10px] text-[#6b7280] mb-1">{grade.label}</div>
                  <div className={`text-[16px] font-[500] ${
                    selectedGrade === (grade.value || "K") ? "text-[#a8aaee]" : "text-[#c5c9d6]"
                  }`}>
                    {grade.num}
                  </div>
                  <div className={`text-[10px] mt-1 ${
                    selectedGrade === (grade.value || "K") ? "text-[#6b7280]" : "text-[#3a3f55]"
                  }`}>
                    {grade.age}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => goStep(3)}
              disabled={!selectedGrade}
              className="w-full bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] disabled:opacity-[0.35] transition"
            >
              Choose subjects →
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-[420px]">
            <h1 className="text-[20px] font-[500] text-white mb-2">Choose your curriculum</h1>
            <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">
              Select the subjects you want to study. You can change this later.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {SUBJECTS.map((subj) => (
                <button
                  key={subj.name}
                  onClick={() => toggleSubject(subj.name)}
                  className={`p-4 rounded-[10px] border-2 transition text-left ${
                    selectedSubjects.includes(subj.name)
                      ? "bg-[#1a1f35] border-[#5b5eff]"
                      : "bg-[#161b27] border-[#1e2330] hover:border-[#3d3faa]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-[8px] mb-2 flex items-center justify-center text-[16px] ${
                    selectedSubjects.includes(subj.name) ? "bg-[#3d3faa]" : "bg-[#1e2330]"
                  }`}>
                    {subj.name[0]}
                  </div>
                  <div className={`text-[13px] font-[500] ${
                    selectedSubjects.includes(subj.name) ? "text-[#a8aaee]" : "text-[#c5c9d6]"
                  }`}>
                    {subj.name}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => goStep(4)}
              disabled={selectedSubjects.length === 0}
              className="w-full bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] disabled:opacity-[0.35] transition"
            >
              Generate my curriculum →
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="w-full max-w-[420px] text-center pt-6">
            <div className="w-15 h-15 rounded-full bg-[#1a1f35] border-2 border-[#3d3faa] flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-[#5b5eff]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
              </svg>
            </div>

            <h1 className="text-[18px] font-[500] text-white mb-2">Building your curriculum...</h1>
            <p className="text-[13px] text-[#6b7280] mb-6">
              Personalising lessons for Grade {selectedGrade || "9"}
            </p>

            <div className="h-[3px] bg-[#1e2330] rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-[#5b5eff] rounded-full transition-all duration-500"
                style={{ width: `${genProgress}%` }}
              />
            </div>

            <div className="bg-[#161b27] rounded-[10px] mb-6">
              {selectedSubjects.map((subj, idx) => (
                <div key={subj} className={`flex items-center gap-3 px-4 py-3 text-[13px] ${
                  idx < selectedSubjects.length - 1 ? "border-b border-[#1a1f2e]" : ""
                }`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    genProgress > ((idx + 1) / selectedSubjects.length) * 90
                      ? "bg-[#1d9e75]"
                      : "bg-[#5b5eff]"
                  }`} />
                  <span className="text-[#c5c9d6]">{subj}</span>
                  <span className="ml-auto text-[#6b7280]">
                    {genProgress > ((idx + 1) / selectedSubjects.length) * 90
                      ? `${SUBJECTS.find((s) => s.name === subj)?.lessons || 16} lessons`
                      : ""}
                  </span>
                </div>
              ))}
            </div>

            {genProgress >= 100 && (
              <button
                onClick={() => goStep(5)}
                className="w-full bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] transition"
              >
                Start learning →
              </button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="w-full max-w-[420px] text-center pt-6">
            <div className="w-16 h-16 rounded-full bg-[#0f2a1f] border-2 border-[#1d9e75] flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-[#1d9e75]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="text-[20px] font-[500] text-white mb-2">
              You're all set, {name.split(" ")[0]}!
            </h1>
            <p className="text-[13px] text-[#6b7280] mb-6">
              Your personalised curriculum is ready across {selectedSubjects.length} subjects
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {selectedSubjects.map((subj) => (
                <div
                  key={subj}
                  className={`px-3 py-2 rounded-full text-[12px] font-[500] border ${
                    subj === "Mathematics"
                      ? "bg-[#1a1f35] text-[#a8aaee] border-[#3d3faa]"
                      : subj === "Science"
                      ? "bg-[#0f2a1f] text-[#5dcaa5] border-[#1d9e75]"
                      : subj === "English"
                      ? "bg-[#1f1a0f] text-[#ef9f27] border-[#854f0b]"
                      : "bg-[#2a1a1a] text-[#f09595] border-[#7a2a2a]"
                  }`}
                >
                  {subj}
                </div>
              ))}
            </div>

            <div className="bg-[#161b27] rounded-[10px] p-4 mb-6">
              <div className="text-[11px] text-[#6b7280] font-[500] mb-3 tracking-widest uppercase">
                Your Plan
              </div>
              <div className="flex justify-between text-[13px] py-2 border-b border-[#1a1f2e]">
                <span className="text-[#6b7280]">Total lessons</span>
                <span className="text-[#c5c9d6] font-[500]">
                  {selectedSubjects.reduce((sum, subj) => {
                    const data = SUBJECTS.find((s) => s.name === subj);
                    return sum + (data?.lessons || 16);
                  }, 0)}
                </span>
              </div>
              <div className="flex justify-between text-[13px] py-2 border-b border-[#1a1f2e]">
                <span className="text-[#6b7280]">Estimated weeks</span>
                <span className="text-[#c5c9d6] font-[500]">24 weeks</span>
              </div>
              <div className="flex justify-between text-[13px] py-2">
                <span className="text-[#6b7280]">AI tutor sessions</span>
                <span className="text-[#c5c9d6] font-[500]">Unlimited</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-[#5b5eff] text-white py-3 rounded-[8px] text-[14px] font-[500] hover:opacity-[0.88] transition"
            >
              Go to my dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
