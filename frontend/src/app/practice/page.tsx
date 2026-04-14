"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, ApiError } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProgressResponse, StudentProfile } from "@/types/student";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExternalCourse {
  title: string;
  provider: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  url: string;
  description: string;
  providerColor: string;
}

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: string;
}

interface SubjectWithChapters {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

interface CurriculumResponse {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

// ─── Course data ──────────────────────────────────────────────────────────────

const COURSES_BY_SUBJECT: Record<string, ExternalCourse[]> = {
  Mathematics: [
    {
      title: "Khan Academy Math",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/math",
      description: "Complete K–12 math curriculum with practice exercises and videos.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "Mathematics for Machine Learning",
      provider: "Coursera",
      level: "Intermediate",
      duration: "~4 months",
      url: "https://www.coursera.org/specializations/mathematics-machine-learning",
      description: "Linear algebra, multivariate calculus, and PCA — foundation for data science.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Essence of Linear Algebra",
      provider: "YouTube (3Blue1Brown)",
      level: "Beginner",
      duration: "~4 hours",
      url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
      description: "Visual, intuitive introduction to linear algebra concepts.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
    {
      title: "Introduction to Calculus",
      provider: "edX (MIT)",
      level: "Intermediate",
      duration: "~13 weeks",
      url: "https://www.edx.org/course/calculus-1a-differentiation",
      description: "Rigorous single-variable calculus from MIT OpenCourseWare.",
      providerColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
  ],
  Physics: [
    {
      title: "Khan Academy Physics",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/science/physics",
      description: "Forces, waves, energy, and electricity with worked examples.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "The Feynman Lectures on Physics",
      provider: "Caltech (Free)",
      level: "Advanced",
      duration: "Self-paced",
      url: "https://www.feynmanlectures.caltech.edu/",
      description: "Legendary physics lectures by Nobel laureate Richard Feynman, free online.",
      providerColor: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    {
      title: "How Things Work: An Introduction to Physics",
      provider: "Coursera (UVA)",
      level: "Beginner",
      duration: "~5 weeks",
      url: "https://www.coursera.org/learn/how-things-work",
      description: "Physics of everyday objects — bicycles, roller coasters, and more.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "MIT 8.01 Classical Mechanics",
      provider: "MIT OpenCourseWare",
      level: "Advanced",
      duration: "Self-paced",
      url: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
      description: "Full undergraduate mechanics course with problem sets and exams.",
      providerColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
  ],
  Chemistry: [
    {
      title: "Khan Academy Chemistry",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/science/chemistry",
      description: "Atoms, periodic table, reactions, and thermodynamics with exercises.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "General Chemistry I",
      provider: "edX (MIT)",
      level: "Intermediate",
      duration: "~14 weeks",
      url: "https://www.edx.org/course/principles-of-chemical-science",
      description: "MIT's Principles of Chemical Science — structure and properties of matter.",
      providerColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
    {
      title: "Crash Course Chemistry",
      provider: "YouTube",
      level: "Beginner",
      duration: "~10 hours",
      url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtPHzzYuWy6fYEaX9mQQ8oGr",
      description: "Fast-paced, entertaining intro to high school and AP Chemistry topics.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
    {
      title: "Organic Chemistry",
      provider: "Khan Academy",
      level: "Advanced",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/science/organic-chemistry",
      description: "Functional groups, reactions, and mechanisms for organic chemistry.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
  ],
  Biology: [
    {
      title: "Khan Academy Biology",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/science/biology",
      description: "Cells, genetics, evolution, and ecology with interactive exercises.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "Introduction to Biology",
      provider: "edX (MIT)",
      level: "Beginner",
      duration: "~16 weeks",
      url: "https://www.edx.org/course/introduction-to-biology-the-secret-of-life-3",
      description: "MIT's popular 7.00x — biochemistry, genetics, recombinant DNA, and genomics.",
      providerColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
    {
      title: "Crash Course Biology",
      provider: "YouTube",
      level: "Beginner",
      duration: "~12 hours",
      url: "https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF",
      description: "40-episode series covering the full high school biology curriculum.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
    {
      title: "Genetics and Society",
      provider: "Coursera",
      level: "Intermediate",
      duration: "~6 weeks",
      url: "https://www.coursera.org/learn/genetics-society",
      description: "Modern genetics — CRISPR, gene editing, and ethical considerations.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
  ],
  English: [
    {
      title: "English Grammar and Essay Writing",
      provider: "Coursera (UC Berkeley)",
      level: "Beginner",
      duration: "~5 months",
      url: "https://www.coursera.org/specializations/english-for-science-technology-engineering-math",
      description: "Academic writing skills for STEM fields — clear, structured communication.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "English for Career Development",
      provider: "Coursera (UPenn)",
      level: "Beginner",
      duration: "~4 weeks",
      url: "https://www.coursera.org/learn/careerdevelopment",
      description: "Professional English skills — writing, speaking, and career vocabulary.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Khan Academy Grammar",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/humanities/grammar",
      description: "Grammar fundamentals — sentences, punctuation, and parts of speech.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "The Craft of Plot",
      provider: "Coursera (Wesleyan)",
      level: "Intermediate",
      duration: "~4 weeks",
      url: "https://www.coursera.org/learn/craft-of-plot",
      description: "Creative writing fundamentals — story structure, character, and conflict.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
  ],
  "Computer Science": [
    {
      title: "CS50: Introduction to Computer Science",
      provider: "edX (Harvard)",
      level: "Beginner",
      duration: "~12 weeks",
      url: "https://cs50.harvard.edu/x/",
      description: "Harvard's legendary intro to CS — scratch, C, Python, SQL, and web development.",
      providerColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    },
    {
      title: "Python for Everybody",
      provider: "Coursera (Michigan)",
      level: "Beginner",
      duration: "~8 months",
      url: "https://www.coursera.org/specializations/python",
      description: "Full Python specialization — data structures, web scraping, and databases.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Khan Academy Computing",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/computing",
      description: "Computer science, programming, and internet fundamentals for beginners.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "Algorithms Specialization",
      provider: "Coursera (Stanford)",
      level: "Advanced",
      duration: "~4 months",
      url: "https://www.coursera.org/specializations/algorithms",
      description: "Tim Roughgarden's definitive algorithms course — divide & conquer, graphs, NP.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
  ],
  History: [
    {
      title: "Khan Academy World History",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/humanities/world-history",
      description: "From the Big Bang to the modern era — comprehensive world history.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "The Modern World: Global History Since 1760",
      provider: "Coursera (Virginia)",
      level: "Beginner",
      duration: "~10 weeks",
      url: "https://www.coursera.org/learn/modern-world",
      description: "How the world transformed from 1760 to the present day.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Crash Course World History",
      provider: "YouTube",
      level: "Beginner",
      duration: "~15 hours",
      url: "https://www.youtube.com/playlist?list=PLBDA2E52FB1EF80C9",
      description: "John Green's engaging 42-episode world history series.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
  ],
  Geography: [
    {
      title: "Our Earth's Future",
      provider: "Coursera (ANU)",
      level: "Beginner",
      duration: "~6 weeks",
      url: "https://www.coursera.org/learn/earth-environment",
      description: "Climate change, ecosystems, and the future of our planet.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Khan Academy Geography",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/humanities/ap-human-geography",
      description: "AP Human Geography — population, culture, political geography.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "Geography Now (World Countries)",
      provider: "YouTube",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.youtube.com/@GeographyNow",
      description: "Country-by-country geography breakdowns in an entertaining format.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
  ],
  Economics: [
    {
      title: "Khan Academy Economics",
      provider: "Khan Academy",
      level: "Beginner",
      duration: "Self-paced",
      url: "https://www.khanacademy.org/economics-finance-domain",
      description: "Micro and macroeconomics, finance, and market structures.",
      providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
    },
    {
      title: "Economics for Non-Economists",
      provider: "Coursera (HSE)",
      level: "Beginner",
      duration: "~7 weeks",
      url: "https://www.coursera.org/learn/economics-for-non-economists",
      description: "How economic thinking applies to everyday decisions and policy.",
      providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      title: "Crash Course Economics",
      provider: "YouTube",
      level: "Beginner",
      duration: "~8 hours",
      url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtPGfCfSMJJhMpMp63f4wKdX",
      description: "35 episodes covering macro, micro, global trade, and financial systems.",
      providerColor: "bg-red-500/15 text-red-400 border-red-500/20",
    },
  ],
};

const DEFAULT_COURSES: ExternalCourse[] = [
  {
    title: "Learning How to Learn",
    provider: "Coursera (UCSD)",
    level: "Beginner",
    duration: "~4 weeks",
    url: "https://www.coursera.org/learn/learning-how-to-learn",
    description: "Science-backed techniques to learn anything faster and more effectively.",
    providerColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  {
    title: "Khan Academy",
    provider: "Khan Academy",
    level: "Beginner",
    duration: "Self-paced",
    url: "https://www.khanacademy.org",
    description: "World-class education for anyone, anywhere — free and comprehensive.",
    providerColor: "bg-green-500/15 text-green-400 border-green-500/20",
  },
];

// ─── Video types ──────────────────────────────────────────────────────────────

const VIDEO_TYPES = [
  { label: "Explanation",       suffix: "explained simply",   icon: "💡", gradient: "from-blue-950/80 to-indigo-950/80 border-blue-500/20",     accent: "text-blue-400"    },
  { label: "Tutorial",          suffix: "full tutorial",      icon: "🎓", gradient: "from-violet-950/80 to-purple-950/80 border-violet-500/20", accent: "text-violet-400"  },
  { label: "Practice Problems", suffix: "practice problems",  icon: "✏️", gradient: "from-emerald-950/80 to-teal-950/80 border-emerald-500/20", accent: "text-emerald-400" },
  { label: "Animation",         suffix: "animated",           icon: "🎬", gradient: "from-pink-950/80 to-rose-950/80 border-pink-500/20",       accent: "text-pink-400"    },
  { label: "Exam Tips",         suffix: "exam tips tricks",   icon: "📝", gradient: "from-amber-950/80 to-orange-950/80 border-amber-500/20",   accent: "text-amber-400"   },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Advanced:     "text-red-400 bg-red-500/10 border-red-500/20",
};

const PROVIDER_RATINGS: Record<string, number> = {
  "Khan Academy": 4.9,
  "Coursera": 4.7,
  "edX (MIT)": 4.8,
  "edX (Harvard)": 4.9,
  "MIT OpenCourseWare": 4.8,
  "YouTube (3Blue1Brown)": 4.9,
  "YouTube": 4.6,
  "Caltech (Free)": 4.7,
  "Coursera (UVA)": 4.5,
  "Coursera (Michigan)": 4.7,
  "Coursera (Stanford)": 4.9,
  "Coursera (UCSD)": 4.8,
  "Coursera (HSE)": 4.4,
  "Coursera (Wesleyan)": 4.5,
  "Coursera (ANU)": 4.5,
  "Coursera (Virginia)": 4.6,
  "Coursera (UPenn)": 4.6,
};

function buildSearchQuery(subject: string, chapter: string, suffix: string, board?: string | null, grade?: string | null) {
  const parts = [board, grade ? `grade ${grade}` : null, subject, chapter, suffix].filter(Boolean);
  return parts.join(" ");
}

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// ─── Course card ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0">
            <path
              d="M6 1l1.39 2.82L10.5 4.27l-2.25 2.19.53 3.09L6 7.99 3.22 9.55l.53-3.09L1.5 4.27l3.11-.45L6 1z"
              fill={i < full ? "#f59e0b" : i === full && hasHalf ? "#f59e0b" : "#374151"}
              opacity={i >= full && !(i === full && hasHalf) ? 0.4 : 1}
            />
          </svg>
        ))}
      </div>
      <span className="text-[10px] text-amber-400 font-semibold">{rating}</span>
    </div>
  );
}

function CourseCard({ course }: { course: ExternalCourse }) {
  const rating = PROVIDER_RATINGS[course.provider] ?? 4.5;
  const ctaLabel = course.duration === "Self-paced"
    ? "Start Free"
    : course.provider.startsWith("YouTube")
    ? "Watch Now"
    : "Open Course";

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/20 hover:bg-[#111c35] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[70%]", course.providerColor)}>
          {course.provider}
        </span>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0", LEVEL_COLORS[course.level])}>
          {course.level}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 group-hover:text-blue-300 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{course.description}</p>
      </div>
      <StarRating rating={rating} />
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
        <span className="text-xs text-white/30 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 3.5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {course.duration}
        </span>
        <span className="text-xs bg-blue-600/80 group-hover:bg-blue-500 text-white flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium">
          {ctaLabel} →
        </span>
      </div>
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [tab, setTab] = useState<"resources" | "videos">("resources");
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [activeResourceSubject, setActiveResourceSubject] = useState<string>("All");

  // Videos tab state
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithChapters | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      try {
        const [prof, progress] = await Promise.all([
          apiGet<StudentProfile>("/api/onboarding/profile").catch(() => null),
          apiGet<ProgressResponse>(`/api/progress/${user!.id}`),
        ]);
        setProfile(prof);

        const enrolled = progress.subjects.map((s) => s.subject_name);
        setEnrolledSubjects(enrolled);

        const eligible = progress.subjects.filter((s) => s.total_chapters > 0);
        const results = await Promise.allSettled(
          eligible.map((sub) =>
            apiGet<CurriculumResponse>(`/api/curriculum/${sub.subject_id}`, 120_000)
              .then((curriculum) => ({ sub, curriculum }))
          )
        );

        const withChapters: SubjectWithChapters[] = [];
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const { sub, curriculum } = r.value;
          const seen = new Set<number>();
          const chapters = curriculum.chapters.filter((c) => {
            if (seen.has(c.order_index)) return false;
            seen.add(c.order_index);
            return true;
          });
          if (chapters.length > 0) {
            withChapters.push({ subject_id: sub.subject_id, subject_name: sub.subject_name, chapters });
          }
        }

        setSubjects(withChapters);
        if (withChapters.length > 0) {
          setSelectedSubject(withChapters[0]);
          setSelectedChapter(withChapters[0].chapters[0] ?? null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading Practice…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Resources tab data ────────────────────────────────────────────────────
  const subjectNames = enrolledSubjects.filter((name) => COURSES_BY_SUBJECT[name]);
  const resourceTabs = ["All", ...subjectNames];
  const visibleSections =
    activeResourceSubject === "All"
      ? subjectNames.length > 0
        ? subjectNames.map((name) => ({ subject: name, courses: COURSES_BY_SUBJECT[name] ?? DEFAULT_COURSES }))
        : [{ subject: "Recommended for You", courses: DEFAULT_COURSES }]
      : [{ subject: activeResourceSubject, courses: COURSES_BY_SUBJECT[activeResourceSubject] ?? DEFAULT_COURSES }];

  // ── Video tab state ───────────────────────────────────────────────────────
  const baseQuery =
    selectedSubject && selectedChapter
      ? [profile?.board, profile?.grade ? `grade ${profile.grade}` : null, selectedSubject.subject_name, selectedChapter.title]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Practice</h1>
          <p className="text-sm text-white/40 mt-1">Curated resources and video search for every topic in your curriculum.</p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-1.5 w-fit mb-8">
          <button
            onClick={() => setTab("resources")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              tab === "resources"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
            </svg>
            Resources
          </button>
          <button
            onClick={() => setTab("videos")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              tab === "videos"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <path d="M10 5.5l3-2v7l-3-2V5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
            </svg>
            Videos
          </button>
        </div>

        {/* ── Resources tab ── */}
        {tab === "resources" && (
          <div className="space-y-8">
            {resourceTabs.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {resourceTabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveResourceSubject(t)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                      activeResourceSubject === t
                        ? "bg-blue-600 text-white border-blue-600 shadow shadow-blue-900/30 scale-105"
                        : "text-white/50 border-white/10 hover:text-white/80 hover:border-white/25 hover:bg-white/[0.06]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-10">
              {visibleSections.map(({ subject, courses }) => (
                <section key={subject}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl">{SUBJECT_EMOJIS[subject] ?? "📚"}</span>
                    <h2 className="text-base font-semibold text-white">{subject}</h2>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {courses.map((course, i) => (
                      <CourseCard key={i} course={course} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* ── Videos tab ── */}
        {tab === "videos" && (
          <div className="space-y-6">
            {/* Chapter selector */}
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Select a Chapter</p>
              {subjects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-white/40 mb-2">No chapters available yet.</p>
                  <a href="/dashboard" className="text-xs text-blue-400 hover:text-blue-300">Generate a curriculum first →</a>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Subject selector */}
                  <div>
                    <label className="block text-xs text-white/40 mb-2">Subject</label>
                    <select
                      value={selectedSubject?.subject_id ?? ""}
                      onChange={(e) => {
                        const sub = subjects.find((s) => s.subject_id === e.target.value) ?? null;
                        setSelectedSubject(sub);
                        setSelectedChapter(sub?.chapters[0] ?? null);
                      }}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    >
                      {subjects.map((s) => (
                        <option key={s.subject_id} value={s.subject_id} className="bg-[#0d1424] text-white">
                          {SUBJECT_EMOJIS[s.subject_name] ?? "📚"} {s.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter selector */}
                  <div>
                    <label className="block text-xs text-white/40 mb-2">Chapter</label>
                    <select
                      value={selectedChapter?.id ?? ""}
                      onChange={(e) => {
                        const ch = selectedSubject?.chapters.find((c) => c.id === e.target.value) ?? null;
                        setSelectedChapter(ch);
                      }}
                      disabled={!selectedSubject}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-40"
                    >
                      {(selectedSubject?.chapters ?? []).map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0d1424] text-white">
                          {c.order_index}. {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Video type cards */}
            {baseQuery ? (
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Find Videos on YouTube</p>
                  {selectedChapter && (
                    <p className="text-sm text-white/60">
                      <span className="text-white/80 font-medium">{selectedSubject?.subject_name}</span>
                      <span className="text-white/30 mx-2">·</span>
                      {selectedChapter.order_index}. {selectedChapter.title}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {VIDEO_TYPES.map((vt) => {
                    const q = buildSearchQuery(
                      selectedSubject?.subject_name ?? "",
                      selectedChapter?.title ?? "",
                      vt.suffix,
                      profile?.board,
                      profile?.grade
                    );
                    const ytUrl = youtubeSearchUrl(q);
                    return (
                      <a
                        key={vt.label}
                        href={ytUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "group bg-gradient-to-br border rounded-2xl p-5 flex flex-col gap-3 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 transition-all duration-200",
                          vt.gradient
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{vt.icon}</span>
                          <div>
                            <p className={cn("font-semibold text-sm", vt.accent)}>{vt.label}</p>
                            <p className="text-xs text-white/30 mt-0.5">Opens YouTube →</p>
                          </div>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 font-mono bg-black/20 rounded-lg px-2.5 py-2">
                          {q}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-white/25">YouTube Search</span>
                          <span className={cn("text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.07] group-hover:bg-white/[0.12] transition-colors", vt.accent)}>
                            Search →
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : subjects.length > 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="text-white/30">
                      <rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
                      <path d="M11 6.5l3-2v7l-3-2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <p className="text-white/50 font-medium">Select a chapter above</p>
                  <p className="text-sm text-white/30 mt-1">Choose a subject and chapter to find videos.</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}
