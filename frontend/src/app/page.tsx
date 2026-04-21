import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  LineChart,
  Sparkles,
  Calculator,
  FlaskConical,
  Code2,
  Palette,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* ═════════ decorative background blobs (page-wide, behind everything) ═════════ */}
      <Blobs />

      {/* ═════════ Marketing top nav ═════════ */}
      <header className="relative z-20">
        <div className="max-w-[1240px] mx-auto px-6 pt-6 flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center shadow-card">
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.4} />
            </div>
            <span className="text-[22px] font-extrabold tracking-tight">
              <span className="text-[var(--text-primary)]">Learn</span>
              <span className="text-[var(--brand-blue)]">OS</span>
            </span>
          </Link>

          {/* Center links */}
          <nav className="hidden md:flex items-center gap-7 ml-6 text-[15px] font-semibold text-[var(--text-body)]">
            <a href="#features" className="hover:text-[var(--brand-blue)] transition">Features</a>
            <a href="#subjects" className="hover:text-[var(--brand-blue)] transition">Courses</a>
            <a href="#testimonials" className="hover:text-[var(--brand-blue)] transition">About Us</a>
            <a href="#pricing" className="hover:text-[var(--brand-blue)] transition">Pricing</a>
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center bg-[#14b8a6] hover:bg-[#0d9488] text-white font-bold text-[13px] px-5 py-2.5 rounded-full shadow-card transition"
            >
              Parent/Teacher Portal
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center bg-[var(--brand-blue)] hover:bg-[#1d4ed8] text-white font-bold text-[13px] px-5 py-2.5 rounded-full shadow-card transition"
            >
              Log In
            </Link>
          </div>
        </div>
      </header>

      {/* ═════════ HERO ═════════ */}
      <section className="relative z-10">
        <div className="max-w-[1240px] mx-auto px-6 pt-12 md:pt-16 pb-10 grid md:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <h1 className="font-display text-[40px] sm:text-[52px] md:text-[60px] font-extrabold leading-[1.04] text-[var(--text-primary)] mb-5">
              Unlock Your Child&rsquo;s<br />
              Potential with{" "}
              <span className="text-[var(--brand-blue)]">LearnOS</span>!
            </h1>
            <p className="text-[17px] sm:text-[19px] text-[var(--text-body)] max-w-[520px] mb-8 leading-relaxed">
              Fun, Interactive, &amp; Standard-Aligned Learning for K-12 Students
            </p>

            <div className="flex items-center gap-5 flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white font-extrabold text-[15px] px-7 py-4 rounded-full shadow-glow hover:scale-[1.03] transition-transform"
              >
                Start Learning Today
              </Link>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="text-[var(--brand-blue)] text-[22px] font-extrabold italic">6-16</span>
                <Sparkles className="w-4 h-4 text-[#fbbf24]" />
              </div>
            </div>
          </div>

          {/* Classroom illustration panel */}
          <ClassroomIllustration />
        </div>

        {/* Feature cards row */}
        <div id="features" className="max-w-[1100px] mx-auto px-6 -mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={<BookOpen className="w-8 h-8 text-[var(--brand-blue)]" strokeWidth={2.2} />}
            iconBg="#dbeafe"
            title="Engaging Courses"
            desc="Personalized Math, Science, Reading & more"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-[#10b981]" strokeWidth={2.2} />}
            iconBg="#d1fae5"
            title="Interactive Learning"
            desc="Gamified lessons, quizzes, & activities"
          />
          <FeatureCard
            icon={<LineChart className="w-8 h-8 text-[var(--accent)]" strokeWidth={2.2} />}
            iconBg="#ffedd5"
            title="Track Progress"
            desc="Real-time feedback & detailed reports"
          />
        </div>
      </section>

      {/* ═════════ POPULAR SUBJECTS ═════════ */}
      <section id="subjects" className="relative z-10 mt-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="text-3xl md:text-[34px] font-extrabold text-[var(--text-primary)] mb-8">Popular Subjects</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <SubjectTile color="#60a5fa" bg="#bfdbfe" title="Math" Icon={Calculator} />
            <SubjectTile color="#fb923c" bg="#fed7aa" title="English" Icon={BookOpen} />
            <SubjectTile color="#34d399" bg="#bbf7d0" title="Science" Icon={FlaskConical} />
            <SubjectTile color="#a855f7" bg="#e9d5ff" title="Coding" Icon={Code2} />
            <SubjectTile color="#facc15" bg="#fef08a" title="Art" Icon={Palette} />
          </div>
        </div>
      </section>

      {/* ═════════ TESTIMONIALS ═════════ */}
      <section id="testimonials" className="relative z-10 mt-24">
        <div className="max-w-[1100px] mx-auto px-6 grid md:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-[#dbeafe] -z-10" />
            <div className="absolute -bottom-8 -right-4 w-20 h-20 rounded-full bg-[#fef08a] -z-10" />
            <div className="rounded-[28px] bg-white border-2 border-[var(--border)] shadow-elevated p-6">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#dbeafe] via-[#fef9c3] to-[#fed7aa] flex items-center justify-center relative overflow-hidden">
                <div className="text-[140px] leading-none">👩‍🏫</div>
                <div className="absolute top-6 left-6 text-3xl">📚</div>
                <div className="absolute top-6 right-6 text-3xl">🌟</div>
                <div className="absolute bottom-6 left-6 text-3xl">✏️</div>
                <div className="absolute bottom-6 right-6 text-3xl">🎨</div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl md:text-[36px] font-extrabold text-[var(--text-primary)] mb-2">Testimonials</h2>
            <p className="text-[var(--text-muted)] mb-6">Happy students &amp; parents</p>

            <div className="space-y-4">
              <TestimonialCard
                quote="LearnOS completely changed how my daughter approaches homework. The AI tutor feels like a patient friend — she actually asks for more lessons."
                author="Priya &middot; Parent of Grade 6"
              />
              <TestimonialCard
                quote="I love the voice tutor! It explains things in a way I actually get. Plus the XP and streaks make me want to keep going every day."
                author="Leo &middot; Grade 8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═════════ PARTNERS ═════════ */}
      <section className="relative z-10 mt-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <h3 className="text-center text-sm font-bold tracking-wider text-[var(--text-muted)] uppercase mb-6">Partners</h3>
          <div className="flex flex-wrap justify-center items-center gap-10 opacity-80">
            <PartnerBadge label="Common Core" icon={<ShieldCheck className="w-5 h-5" />} />
            <PartnerBadge label="STEM Certified" icon={<BadgeCheck className="w-5 h-5" />} />
            <PartnerBadge label="COPPA Safe" icon={<ShieldCheck className="w-5 h-5" />} />
            <PartnerBadge label="ISTE Standards" icon={<BadgeCheck className="w-5 h-5" />} />
          </div>
        </div>
      </section>

      {/* ═════════ GET STARTED CTA ═════════ */}
      <section id="pricing" className="relative z-10 mt-24">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="relative rounded-[32px] p-10 md:p-14 text-center overflow-hidden bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#6366f1] shadow-elevated">
            <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-[#fbbf24]/40 blur-md" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-[#f97316]/40 blur-md" />
            <div className="absolute top-8 right-10 text-4xl opacity-70">⭐</div>
            <div className="absolute bottom-6 left-10 text-3xl opacity-70">✨</div>

            <h2 className="text-[30px] md:text-[38px] font-extrabold text-white mb-3">Get Started in Minutes</h2>
            <p className="text-white/90 max-w-xl mx-auto mb-7">
              Get your child&rsquo;s personalized learning journey started in minutes.
              No credit card required.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white font-extrabold px-8 py-3.5 rounded-full shadow-glow hover:scale-[1.04] transition-transform"
            >
              Start Learning Today
            </Link>
          </div>
        </div>
      </section>

      {/* ═════════ FOOTER ═════════ */}
      <footer className="relative z-10 mt-20 border-t border-[var(--border)] bg-white/70 backdrop-blur">
        <div className="max-w-[1100px] mx-auto px-6 py-12 grid md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#6366f1] flex items-center justify-center shadow-card">
                <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.4} />
              </div>
              <span className="text-[20px] font-extrabold tracking-tight">
                <span className="text-[var(--text-primary)]">Learn</span>
                <span className="text-[var(--brand-blue)]">OS</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] mt-4 max-w-[280px] leading-relaxed">
              AI-powered, personalized, standards-aligned learning for every K-12 student.
            </p>
          </div>

          <FooterCol
            title="Company"
            items={["About", "Careers", "Press", "Media"]}
          />
          <FooterCol
            title="Courses"
            items={["Math", "Science", "English", "Coding"]}
          />
          <FooterCol
            title="Help"
            items={["Blog", "Contact Us", "FAQ", "Support"]}
          />
        </div>
        <div className="border-t border-[var(--border)]">
          <div className="max-w-[1100px] mx-auto px-6 py-5 text-xs text-[var(--text-muted)] flex flex-wrap justify-between gap-3">
            <div>Copyright 2026 &copy; LearnOS. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[var(--text-primary)] transition">Privacy</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────────── Sub-components ─────────────────────────────── */

function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Big soft blobs */}
      <div className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-[#3b82f6]/25 blur-3xl" />
      <div className="absolute -top-16 right-[-120px] w-[360px] h-[360px] rounded-full bg-[#fbbf24]/30 blur-3xl" />
      <div className="absolute top-[42%] -left-24 w-[320px] h-[320px] rounded-full bg-[#22c55e]/20 blur-3xl" />
      <div className="absolute top-[54%] right-[-100px] w-[360px] h-[360px] rounded-full bg-[#f97316]/25 blur-3xl" />

      {/* Accent dots (crayon-bright) */}
      <span className="absolute top-[9%] left-[15%] w-4 h-4 rounded-full bg-[#3b82f6]" />
      <span className="absolute top-[12%] left-[42%] w-3 h-3 rounded-full bg-[#fbbf24]" />
      <span className="absolute top-[22%] right-[18%] w-5 h-5 rounded-full bg-[#22c55e]" />
      <span className="absolute top-[46%] left-[5%] w-3 h-3 rounded-full bg-[#f97316]" />
      <span className="absolute top-[60%] right-[8%] w-4 h-4 rounded-full bg-[#a855f7]" />
      <span className="absolute top-[80%] left-[10%] w-3 h-3 rounded-full bg-[#3b82f6]" />

      {/* Tiny star flecks */}
      <span className="absolute top-[5%] left-[48%] text-[26px]">✦</span>
      <span className="absolute top-[30%] left-[30%] text-[18px] text-[#fbbf24]">✦</span>
      <span className="absolute top-[52%] right-[30%] text-[20px] text-[#3b82f6]">✦</span>
      <span className="absolute top-[75%] left-[48%] text-[18px] text-[#22c55e]">✦</span>

      {/* Dotted pattern patches */}
      <div
        className="absolute bottom-[14%] left-[6%] w-36 h-20 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle, #fbbf24 1.5px, transparent 2px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        className="absolute top-[8%] right-[24%] w-32 h-14 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle, #f97316 1.5px, transparent 2px)",
          backgroundSize: "12px 12px",
        }}
      />
    </div>
  );
}

function ClassroomIllustration() {
  return (
    <div className="relative">
      {/* Outer circle framing the illustration */}
      <div className="relative aspect-square max-w-[520px] mx-auto rounded-full bg-gradient-to-br from-[#93c5fd] via-[#bfdbfe] to-[#dbeafe] shadow-elevated overflow-hidden border-[10px] border-white">
        {/* Classroom backdrop — blackboard + posters */}
        <div className="absolute inset-[8%] rounded-[48px] bg-gradient-to-b from-[#eef2ff] to-[#e0f2fe] flex items-center justify-center overflow-hidden">
          {/* Blackboard */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[62%] h-[32%] rounded-xl bg-[#1f2937] flex flex-col items-center justify-center gap-1 border-4 border-[#a16207] shadow-elevated">
            <div className="text-white text-[18px] font-bold tracking-wide">1 + 2 = 3</div>
            <div className="text-white/90 text-[16px] font-bold">A B C</div>
          </div>

          {/* Side posters */}
          <div className="absolute top-[18%] left-[4%] w-14 h-14 rounded-xl bg-white border-2 border-[var(--border)] flex items-center justify-center text-3xl shadow-card">🚀</div>
          <div className="absolute top-[18%] right-[4%] w-14 h-14 rounded-xl bg-white border-2 border-[var(--border)] flex items-center justify-center text-3xl shadow-card">⚛️</div>
          <div className="absolute top-[40%] left-[3%] w-14 h-14 rounded-xl bg-white border-2 border-[var(--border)] flex items-center justify-center text-3xl shadow-card">📖</div>
          <div className="absolute top-[40%] right-[3%] w-14 h-14 rounded-xl bg-white border-2 border-[var(--border)] flex items-center justify-center text-3xl shadow-card">🎨</div>

          {/* Kids row */}
          <div className="absolute bottom-[6%] left-0 right-0 flex justify-center items-end gap-3 px-4">
            <div className="text-[58px] drop-shadow-md">👧🏻</div>
            <div className="text-[58px] drop-shadow-md">👦🏽</div>
            <div className="text-[58px] drop-shadow-md">🧑🏿</div>
            <div className="text-[58px] drop-shadow-md">👩🏻‍🦰</div>
          </div>
        </div>

        {/* Floating decorations */}
        <div className="absolute top-4 left-6 text-3xl animate-float">⭐</div>
        <div className="absolute top-8 right-8 text-3xl animate-float" style={{ animationDelay: "0.6s" }}>✨</div>
        <div className="absolute bottom-6 right-10 text-3xl animate-float" style={{ animationDelay: "1.2s" }}>🌟</div>
      </div>

      {/* Floating badges around illustration */}
      <div className="hidden md:flex absolute -left-4 top-10 w-16 h-16 rounded-2xl bg-white border-2 border-[var(--border)] shadow-elevated items-center justify-center text-3xl rotate-[-8deg]">🧮</div>
      <div className="hidden md:flex absolute -right-2 top-16 w-16 h-16 rounded-2xl bg-white border-2 border-[var(--border)] shadow-elevated items-center justify-center text-3xl rotate-[6deg]">🧪</div>
      <div className="hidden md:flex absolute -left-2 bottom-14 w-16 h-16 rounded-2xl bg-white border-2 border-[var(--border)] shadow-elevated items-center justify-center text-3xl rotate-[5deg]">📏</div>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  desc,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-[24px] border-2 border-[var(--border)] shadow-card p-6 hover:-translate-y-1 hover:shadow-elevated transition-all text-center">
      <div
        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-card"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <h3 className="font-extrabold text-[var(--text-primary)] text-[19px] mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

function SubjectTile({
  color,
  bg,
  title,
  Icon,
}: {
  color: string;
  bg: string;
  title: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div
      className="rounded-[22px] aspect-square p-5 flex flex-col items-center justify-center gap-3 shadow-card hover:scale-[1.04] hover:shadow-elevated transition-all cursor-pointer"
      style={{ background: bg, border: `2px solid ${color}55` }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-card"
        style={{ background: "white" }}
      >
        <Icon className="w-9 h-9" strokeWidth={2.2} />
      </div>
      <div className="font-extrabold text-[19px]" style={{ color: darken(color) }}>
        {title}
      </div>
    </div>
  );
}

function darken(color: string): string {
  // Simple helper: bright tile colors need a darker label for contrast.
  const map: Record<string, string> = {
    "#60a5fa": "#1d4ed8",
    "#fb923c": "#c2410c",
    "#34d399": "#047857",
    "#a855f7": "#7e22ce",
    "#facc15": "#a16207",
  };
  return map[color] ?? color;
}

function TestimonialCard({ quote, author }: { quote: string; author: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-[var(--border)] shadow-card p-5">
      <p className="text-[var(--text-body)] text-[15px] leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
      <div className="mt-3 text-xs font-bold text-[var(--brand-blue)]">{author}</div>
    </div>
  );
}

function PartnerBadge({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)] font-semibold text-sm tracking-wide">
      <span className="w-9 h-9 rounded-full bg-[var(--bg-deep)] text-[var(--brand-blue)] flex items-center justify-center">
        {icon}
      </span>
      {label}
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-extrabold text-[var(--text-primary)] text-sm mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-[var(--text-muted)]">
        {items.map((it) => (
          <li key={it}>
            <a href="#" className="hover:text-[var(--text-primary)] transition">{it}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
