"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface Question {
  subj: string;
  cls: string;
  text: string;
  opts: string[];
  correct: number;
  exp: string;
}

interface AnswerRecord {
  q: string;
  subj: string;
  correct: boolean;
  chosen: string;
  answer: string;
}

// Quiz subjects are abstract ("Math", "Science", ...). Map each to the list of
// real student subjects it could correspond to, in preference order. We pick
// the first one that actually exists in the learner's enrolled subjects.
const SUBJECT_ALIASES: Record<string, string[]> = {
  Math: ["Mathematics", "Math"],
  Science: ["Physics", "Chemistry", "Biology", "Science"],
  English: ["English"],
  History: ["History", "Social Studies"],
};

// Question-level keyword hints that refine a generic "Science" tag into a
// specific discipline. Without this, a Physics question like "Sound travels
// fastest through…" gets routed to Biology just because Biology shows up
// alphabetically first in the student's enrolled subjects.
const SCIENCE_KEYWORDS: Array<{ discipline: string; patterns: RegExp[] }> = [
  {
    discipline: "Physics",
    patterns: [
      /\b(sound|wave|light|force|gravity|friction|velocity|acceleration|momentum|energy|electricity|magnet|circuit|newton|mass|weight|pressure|optics|lens|refract|reflect|motion|heat|thermodynamic)\b/i,
    ],
  },
  {
    discipline: "Chemistry",
    patterns: [
      /\b(atom|molecul|element|compound|acid|base|reaction|bond|periodic|chemical|oxidation|solution|ph|mole|stoichiom|ionic|covalent|metal|alloy|crystal)\b/i,
    ],
  },
  {
    discipline: "Biology",
    patterns: [
      /\b(cell|dna|rna|gene|chromosome|organism|mitochondria|nucleus|tissue|organ|blood|heart|lung|brain|muscle|bone|plant|photosynthesis|respiration|enzyme|protein|bacteria|virus|evolution|species|ecosystem)\b/i,
    ],
  },
];

function refineSubject(rawSubj: string, questionText: string): string {
  if (rawSubj !== "Science") return rawSubj;
  for (const { discipline, patterns } of SCIENCE_KEYWORDS) {
    if (patterns.some((p) => p.test(questionText))) return discipline;
  }
  return rawSubj;
}

const SUBJECT_COLORS: Record<string, string> = {
  Math: "#5b5eff",
  Science: "#1d9e75",
  English: "#ef9f27",
  History: "#e24b4a",
};

const SUBJECT_CLASSES: Record<string, string> = {
  Math: "badge-math",
  Science: "badge-sci",
  English: "badge-eng",
  History: "badge-hist",
};

const SUBJECT_NEON: Record<string, string> = {
  Math: "var(--neon-cyan)",
  Science: "var(--neon-lime)",
  English: "var(--neon-yel)",
  History: "var(--neon-ora)",
};

const SUBJECT_EMOJI: Record<string, string> = {
  Math: "➗",
  Science: "🧪",
  English: "📚",
  History: "🏛",
};

// Question pool (TODO: fetch from API once concept.question fields are populated)
const ALL_QUESTIONS: Question[] = [
  // ── Math ──────────────────────────────────────────────────────────────
  { subj: "Math", cls: "badge-math", text: "What is the slope of the line y = 3x − 4?", opts: ["−4", "3", "7", "−3"], correct: 1, exp: "The slope is the coefficient of x. Here that is 3; the −4 is the y-intercept." },
  { subj: "Math", cls: "badge-math", text: "Which point lies on the line y = 2x + 1?", opts: ["(0,0)", "(1,3)", "(2,4)", "(3,8)"], correct: 1, exp: "When x = 1: y = 2(1) + 1 = 3." },
  { subj: "Math", cls: "badge-math", text: "Solve for x: 5x − 7 = 18.", opts: ["3", "4", "5", "6"], correct: 2, exp: "5x = 25, so x = 5." },
  { subj: "Math", cls: "badge-math", text: "What is the value of 7² − 3²?", opts: ["16", "20", "40", "58"], correct: 2, exp: "49 − 9 = 40." },
  { subj: "Math", cls: "badge-math", text: "What is the area of a triangle with base 8 and height 5?", opts: ["13", "20", "40", "80"], correct: 1, exp: "Area = ½ × base × height = ½ × 8 × 5 = 20." },
  { subj: "Math", cls: "badge-math", text: "If f(x) = 2x + 3, what is f(4)?", opts: ["7", "9", "11", "14"], correct: 2, exp: "f(4) = 2(4) + 3 = 11." },
  { subj: "Math", cls: "badge-math", text: "What is the probability of rolling an even number on a fair six-sided die?", opts: ["1/6", "1/3", "1/2", "2/3"], correct: 2, exp: "Even outcomes are 2, 4, 6 — 3 of 6 = 1/2." },
  { subj: "Math", cls: "badge-math", text: "Which is a prime number?", opts: ["15", "21", "23", "27"], correct: 2, exp: "23 has no divisors other than 1 and itself." },
  { subj: "Math", cls: "badge-math", text: "The sum of interior angles of a triangle is…", opts: ["90°", "180°", "270°", "360°"], correct: 1, exp: "Always 180° for any triangle in Euclidean geometry." },
  { subj: "Math", cls: "badge-math", text: "Simplify: 3(x + 2) − 2x.", opts: ["x + 6", "x + 2", "5x + 6", "x − 6"], correct: 0, exp: "3x + 6 − 2x = x + 6." },
  { subj: "Math", cls: "badge-math", text: "What is the square root of 144?", opts: ["10", "11", "12", "14"], correct: 2, exp: "12 × 12 = 144." },
  { subj: "Math", cls: "badge-math", text: "Which fraction is equivalent to 0.75?", opts: ["1/2", "2/3", "3/4", "4/5"], correct: 2, exp: "3 ÷ 4 = 0.75." },

  // ── Science ───────────────────────────────────────────────────────────
  { subj: "Science", cls: "badge-sci", text: "What is the primary function of the mitochondria?", opts: ["Protein synthesis", "Energy production", "DNA storage", "Cell division"], correct: 1, exp: "Mitochondria produce ATP — the cell's energy currency." },
  { subj: "Science", cls: "badge-sci", text: "How many chromosomes do human body cells normally contain?", opts: ["23", "44", "46", "48"], correct: 2, exp: "46 chromosomes (23 pairs). Gametes contain 23." },
  { subj: "Science", cls: "badge-sci", text: "Which force keeps planets in orbit around the Sun?", opts: ["Magnetism", "Friction", "Gravity", "Electrostatic"], correct: 2, exp: "Gravitational attraction between the Sun and each planet." },
  { subj: "Science", cls: "badge-sci", text: "What is the chemical symbol for gold?", opts: ["Gd", "Go", "Au", "Ag"], correct: 2, exp: "Au, from Latin 'aurum'. Ag is silver." },
  { subj: "Science", cls: "badge-sci", text: "Which gas do plants absorb during photosynthesis?", opts: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 2, exp: "They take in CO₂ and release O₂." },
  { subj: "Science", cls: "badge-sci", text: "Sound travels fastest through…", opts: ["Vacuum", "Air", "Water", "Steel"], correct: 3, exp: "Denser, stiffer media transmit sound faster." },
  { subj: "Science", cls: "badge-sci", text: "What is the SI unit of electric current?", opts: ["Volt", "Ohm", "Watt", "Ampere"], correct: 3, exp: "Ampere (A), measuring charge per second." },
  { subj: "Science", cls: "badge-sci", text: "The pH of a neutral solution is…", opts: ["0", "7", "10", "14"], correct: 1, exp: "Pure water at 25°C has pH 7." },
  { subj: "Science", cls: "badge-sci", text: "Which planet is known as the Red Planet?", opts: ["Venus", "Mars", "Jupiter", "Mercury"], correct: 1, exp: "Mars — its surface is rich in iron oxide." },
  { subj: "Science", cls: "badge-sci", text: "What organ pumps blood through the body?", opts: ["Lungs", "Liver", "Heart", "Kidneys"], correct: 2, exp: "The heart's four chambers circulate blood." },
  { subj: "Science", cls: "badge-sci", text: "Which is NOT a state of matter?", opts: ["Solid", "Liquid", "Gas", "Energy"], correct: 3, exp: "Energy is not a state. Plasma is the fourth common state." },
  { subj: "Science", cls: "badge-sci", text: "DNA is primarily found in which part of the cell?", opts: ["Cytoplasm", "Ribosome", "Nucleus", "Membrane"], correct: 2, exp: "Eukaryotic DNA is packaged in the nucleus." },

  // ── English ───────────────────────────────────────────────────────────
  { subj: "English", cls: "badge-eng", text: "Which literary device attributes human traits to non-human things?", opts: ["Simile", "Metaphor", "Personification", "Alliteration"], correct: 2, exp: "Personification gives human qualities to objects or ideas." },
  { subj: "English", cls: "badge-eng", text: "What is a thesis statement?", opts: ["A question the essay asks", "The conclusion's last sentence", "A central argument", "A list of evidence"], correct: 2, exp: "It's the essay's central claim, usually ending the intro." },
  { subj: "English", cls: "badge-eng", text: "Which is a simile?", opts: ["Her voice is music.", "Her voice is like music.", "The wind whispered.", "Time flies."], correct: 1, exp: "Similes use 'like' or 'as'." },
  { subj: "English", cls: "badge-eng", text: "What part of speech is 'quickly'?", opts: ["Noun", "Verb", "Adjective", "Adverb"], correct: 3, exp: "It modifies verbs — adverb." },
  { subj: "English", cls: "badge-eng", text: "Who wrote 'Romeo and Juliet'?", opts: ["Chaucer", "Shakespeare", "Milton", "Dickens"], correct: 1, exp: "William Shakespeare, c. 1595." },
  { subj: "English", cls: "badge-eng", text: "Which word is a synonym of 'rapid'?", opts: ["Slow", "Quick", "Heavy", "Quiet"], correct: 1, exp: "Rapid and quick both mean fast." },
  { subj: "English", cls: "badge-eng", text: "What is the past tense of 'run'?", opts: ["Runned", "Ran", "Running", "Runs"], correct: 1, exp: "'Run' is an irregular verb — past tense is 'ran'." },
  { subj: "English", cls: "badge-eng", text: "A group of words that forms a complete thought is a…", opts: ["Phrase", "Clause", "Sentence", "Paragraph"], correct: 2, exp: "A sentence expresses a complete thought." },
  { subj: "English", cls: "badge-eng", text: "Which punctuation ends a declarative sentence?", opts: ["?", "!", ".", ";"], correct: 2, exp: "A period ends a statement." },
  { subj: "English", cls: "badge-eng", text: "An antonym of 'generous' is…", opts: ["Kind", "Stingy", "Wealthy", "Honest"], correct: 1, exp: "Stingy = unwilling to give, the opposite of generous." },
  { subj: "English", cls: "badge-eng", text: "Who is the protagonist?", opts: ["The villain", "The main character", "The narrator", "A minor character"], correct: 1, exp: "Protagonist = main character driving the story." },
  { subj: "English", cls: "badge-eng", text: "Which is a proper noun?", opts: ["city", "Paris", "building", "river"], correct: 1, exp: "Proper nouns name specific people/places — capitalized." },

  // ── History ───────────────────────────────────────────────────────────
  { subj: "History", cls: "badge-hist", text: "Which acronym describes the main causes of WWI?", opts: ["STEM", "MAIN", "FACE", "DARE"], correct: 1, exp: "Militarism, Alliances, Imperialism, Nationalism." },
  { subj: "History", cls: "badge-hist", text: "In which year did World War II end?", opts: ["1943", "1944", "1945", "1946"], correct: 2, exp: "V-E Day May 1945; V-J Day September 1945." },
  { subj: "History", cls: "badge-hist", text: "Who was the first President of the United States?", opts: ["Jefferson", "Adams", "Washington", "Lincoln"], correct: 2, exp: "George Washington, 1789–1797." },
  { subj: "History", cls: "badge-hist", text: "The Indian independence movement was led by…", opts: ["Nehru", "Bose", "Gandhi", "Patel"], correct: 2, exp: "Mahatma Gandhi led the nonviolent movement." },
  { subj: "History", cls: "badge-hist", text: "The Great Wall was built primarily by which civilization?", opts: ["Roman", "Egyptian", "Chinese", "Persian"], correct: 2, exp: "Ancient Chinese dynasties over many centuries." },
  { subj: "History", cls: "badge-hist", text: "The French Revolution began in which year?", opts: ["1776", "1789", "1804", "1815"], correct: 1, exp: "Storming of the Bastille, 14 July 1789." },
  { subj: "History", cls: "badge-hist", text: "Who wrote the Indian national anthem 'Jana Gana Mana'?", opts: ["Tagore", "Bankim Chatterjee", "Nehru", "Iqbal"], correct: 0, exp: "Rabindranath Tagore, 1911." },
  { subj: "History", cls: "badge-hist", text: "The Renaissance began in which country?", opts: ["France", "Italy", "England", "Germany"], correct: 1, exp: "It started in 14th-century Florence, Italy." },
  { subj: "History", cls: "badge-hist", text: "Which empire built Machu Picchu?", opts: ["Aztec", "Maya", "Inca", "Olmec"], correct: 2, exp: "The Inca Empire, ~1450 CE." },
  { subj: "History", cls: "badge-hist", text: "The Berlin Wall fell in…", opts: ["1987", "1989", "1991", "1993"], correct: 1, exp: "9 November 1989, ending a Cold War symbol." },
  { subj: "History", cls: "badge-hist", text: "Who discovered the sea route to India in 1498?", opts: ["Columbus", "Magellan", "Vasco da Gama", "Cook"], correct: 2, exp: "Vasco da Gama, Portuguese explorer." },
  { subj: "History", cls: "badge-hist", text: "The Magna Carta was signed in which year?", opts: ["1066", "1215", "1492", "1776"], correct: 1, exp: "King John sealed it in 1215." },
];

export default function PracticePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!authLoading && user) {
      buildQuestions();
      setLoading(false);
    }
  }, [user, authLoading, router]);

  function buildQuestions() {
    const pool = subjectFilter === "all" ? ALL_QUESTIONS : ALL_QUESTIONS.filter((q) => q.subj === subjectFilter);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, 8);
    setQuestions(qs);
    restartQuiz(qs);
  }

  function restartQuiz(qs: Question[] = questions) {
    setCurrentIdx(0);
    setScore(0);
    setAnswered(false);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setShowResults(false);
    setSelectedOption(null);
    setFeedback(null);
  }

  function handleSubjectFilter(subj: string) {
    setSubjectFilter(subj);
    const pool = subj === "all" ? ALL_QUESTIONS : ALL_QUESTIONS.filter((q) => q.subj === subj);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, 8);
    setQuestions(qs);
    restartQuiz(qs);
  }

  function selectOption(optIdx: number) {
    if (answered) return;

    const q = questions[currentIdx];
    const isCorrect = optIdx === q.correct;

    setSelectedOption(optIdx);
    setAnswered(true);

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      setBestStreak(Math.max(bestStreak, streak + 1));
      setFeedback({ correct: true, text: `Correct! ${q.exp}` });
    } else {
      setStreak(0);
      setFeedback({ correct: false, text: `Not quite. ${q.exp}` });
    }

    setAnswers([...answers, { q: q.text, subj: q.subj, correct: isCorrect, chosen: q.opts[optIdx], answer: q.opts[q.correct] }]);
  }

  function nextQuestion() {
    if (currentIdx >= questions.length - 1) {
      setShowResults(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setAnswered(false);
      setFeedback(null);
    }
  }

  async function askTutorAbout(specific?: AnswerRecord) {
    // If called with a specific answer row (the per-question "Ask" buttons
    // in the combat log), route the tutor to THAT question. Otherwise fall
    // back to the "first wrong / most-missed subject" logic for the big
    // bottom CTA.
    const wrong = answers.filter((a) => !a.correct);
    const topicAnswer = specific ?? wrong[0] ?? answers[0];
    if (!topicAnswer) {
      router.push("/learn");
      return;
    }
    const missesBySubject: Record<string, number> = {};
    for (const a of wrong) missesBySubject[a.subj] = (missesBySubject[a.subj] ?? 0) + 1;
    const rawTarget = specific
      ? specific.subj
      : Object.entries(missesBySubject).sort((a, b) => b[1] - a[1])[0]?.[0]
        ?? topicAnswer.subj;
    // Refine generic "Science" → Physics/Chem/Bio based on keywords in the
    // question text, so a sound-waves question doesn't land on Biology.
    const targetSubj = refineSubject(rawTarget, topicAnswer.q);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const res = await fetch(`/api/proxy/api/onboarding/subjects`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.push("/learn");
        return;
      }
      const data = await res.json();
      const subjects: Array<{ id: string; name: string }> = data.subjects ?? [];
      const aliases = SUBJECT_ALIASES[targetSubj] ?? [targetSubj];
      // Iterate aliases in priority order — the old `subjects.find(s =>
      // aliases.some(...))` returned whichever student subject appeared
      // FIRST in the enrolled list (alphabetical), so "Biology" beat
      // "Physics" even when Physics was a higher-priority alias.
      let matched: { id: string; name: string } | undefined;
      for (const alias of aliases) {
        matched = subjects.find((s) =>
          s.name.toLowerCase().includes(alias.toLowerCase()),
        );
        if (matched) break;
      }
      matched = matched ?? subjects[0];
      if (!matched) {
        router.push("/learn");
        return;
      }
      // Fetch the chapters of the matched subject and pick the first available
      const curriculumRes = await fetch(`/api/proxy/api/curriculum/${matched.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!curriculumRes.ok) {
        router.push(`/learn/${matched.id}`);
        return;
      }
      const curriculum = await curriculumRes.json();
      const chapters: Array<{ id: string; status?: string }> = curriculum.chapters ?? [];
      const chapter = chapters.find((c) => c.status !== "locked") ?? chapters[0];
      if (!chapter) {
        router.push(`/learn/${matched.id}`);
        return;
      }
      const params = new URLSearchParams({
        topic: topicAnswer.q,
        correct: topicAnswer.answer,
        chosen: topicAnswer.chosen,
      });
      router.push(`/learn/${matched.id}/${chapter.id}?${params.toString()}`);
    } catch {
      router.push("/learn");
    }
  }

  function skipQuestion() {
    const q = questions[currentIdx];
    setAnswers([...answers, { q: q.text, subj: q.subj, correct: false, chosen: "Skipped", answer: q.opts[q.correct] }]);
    setStreak(0);
    if (currentIdx >= questions.length - 1) {
      setShowResults(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setAnswered(false);
      setFeedback(null);
    }
  }

  if (authLoading || loading) {
    return (
      <ArcadeShell active="Practice" pixels={10}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center" }}>
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 16px",
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-mag))",
                border: "3px solid #170826",
                boxShadow: "0 0 24px rgba(39,224,255,0.6)",
              }}
              className="anim-bop"
            />
            <span className="label" style={{ color: "var(--neon-cyan)" }}>LOADING BATTLE…</span>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  if (!user) return null;

  const q = questions[currentIdx];
  const accuracy = answers.length > 0 ? Math.round((score / answers.length) * 100) : 0;
  const totalAccuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Derive HP bars from quiz state for the "boss battle" visual.
  // Player HP reflects remaining questions (full at start, drains as you take hits).
  // Boss HP drains as the player gets questions right.
  const totalQs = questions.length || 1;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const playerHp = Math.max(0, 100 - Math.round((wrongCount / totalQs) * 100));
  const bossHp = Math.max(0, 100 - Math.round((score / totalQs) * 100));
  const subjNeon = q ? (SUBJECT_NEON[q.subj] ?? "var(--neon-cyan)") : "var(--neon-cyan)";

  const filters = ["all", "Math", "Science", "English", "History"];

  return (
    <ArcadeShell active="Practice" pixels={10}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span className="label" style={{ color: "var(--neon-mag)" }}>⚔ BOSS BATTLE</span>
        <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
          Practice <span style={{ color: "var(--neon-mag)" }}>Arena</span>
        </h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Defeat the boss to lock in mastery and earn XP.
        </p>
      </div>

      {/* Subject filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {filters.map((subj) => {
          const active = subjectFilter === subj;
          const color = subj === "all" ? "var(--neon-yel)" : (SUBJECT_NEON[subj] ?? "var(--neon-cyan)");
          return (
            <button
              key={subj}
              onClick={() => handleSubjectFilter(subj)}
              className="pill"
              style={{
                cursor: "pointer",
                color: active ? "#170826" : color,
                borderColor: color,
                background: active ? color : "transparent",
                fontWeight: 700,
              }}
            >
              {subj === "all" ? "All subjects" : `${SUBJECT_EMOJI[subj] ?? ""} ${subj}`}
            </button>
          );
        })}
      </div>

      {!showResults && q && (
        <div className="panel mag" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 70% 20%, rgba(255,62,165,0.25), transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(155,92,255,0.2), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* HP bars */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              position: "relative",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="label" style={{ color: "var(--neon-cyan)" }}>You · Hero</span>
                <span className="label">HP {playerHp} / 100</span>
              </div>
              <PixelBar value={playerHp} color="var(--neon-cyan)" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="label" style={{ color: "var(--neon-mag)" }}>
                  {q.subj} Overlord
                </span>
                <span className="label">HP {bossHp} / 100</span>
              </div>
              <PixelBar value={bossHp} color="var(--neon-mag)" />
            </div>
          </div>

          {/* Avatars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center", position: "relative" }}>
            <div style={{ textAlign: "center" }} className="anim-float">
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 28,
                  margin: "0 auto",
                  background: "linear-gradient(135deg, #27e0ff, #9b5cff)",
                  border: "4px solid #170826",
                  boxShadow: "0 10px 0 #170826, 0 0 30px rgba(39,224,255,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 64,
                }}
              >
                🎮
              </div>
              <div
                className="pill"
                style={{ marginTop: 10, color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
              >
                Streak · {streak}
              </div>
            </div>
            <div style={{ textAlign: "center" }} className="anim-wobble">
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 28,
                  margin: "0 auto",
                  background: "linear-gradient(135deg, #ff3ea5, #5c2fb8)",
                  border: "4px solid #170826",
                  boxShadow: "0 10px 0 #170826, 0 0 30px rgba(255,62,165,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 80,
                  position: "relative",
                }}
              >
                {SUBJECT_EMOJI[q.subj] ?? "👾"}
                <div
                  style={{
                    position: "absolute",
                    top: -16,
                    left: -16,
                    background: "var(--neon-yel)",
                    color: "#170826",
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "2px solid #170826",
                    fontSize: 10,
                    fontFamily: "var(--f-display)",
                    fontWeight: 900,
                  }}
                >
                  BOSS
                </div>
              </div>
              <div
                className="pill"
                style={{ marginTop: 10, color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
              >
                {q.subj} · ELITE
              </div>
            </div>
          </div>

          {/* Question card */}
          <div
            style={{
              marginTop: 28,
              padding: 22,
              background: "rgba(0,0,0,0.5)",
              border: "2px solid var(--line)",
              borderRadius: 16,
              position: "relative",
            }}
          >
            <span className="label" style={{ color: "var(--neon-yel)" }}>
              Question {currentIdx + 1} / {questions.length} · +15 dmg if correct
            </span>
            <h2 className="h-display" style={{ fontSize: 26, margin: "10px 0 18px", lineHeight: 1.3 }}>
              {q.text}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {q.opts.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrectOpt = answered && i === q.correct;
                const isWrongPick = answered && isSelected && i !== q.correct;

                let borderColor = "var(--line)";
                let bg = "rgba(255,255,255,0.04)";
                let textColor = "var(--ink)";
                let glow = "none";

                if (isCorrectOpt) {
                  borderColor = "var(--neon-lime)";
                  bg = "rgba(164,255,94,0.12)";
                  textColor = "var(--neon-lime)";
                  glow = "0 0 16px rgba(164,255,94,0.5)";
                } else if (isWrongPick) {
                  borderColor = "var(--neon-mag)";
                  bg = "rgba(255,62,165,0.12)";
                  textColor = "var(--neon-mag)";
                  glow = "0 0 16px rgba(255,62,165,0.5)";
                } else if (isSelected && !answered) {
                  borderColor = subjNeon;
                  bg = "rgba(255,255,255,0.08)";
                  glow = `0 0 16px ${subjNeon}`;
                }

                return (
                  <button
                    key={i}
                    onClick={() => selectOption(i)}
                    disabled={answered}
                    style={{
                      padding: "16px 14px 14px",
                      borderRadius: 12,
                      background: bg,
                      border: `2px solid ${borderColor}`,
                      color: textColor,
                      cursor: answered ? "default" : "pointer",
                      textAlign: "center",
                      position: "relative",
                      boxShadow: glow,
                      transition: "all 0.15s ease",
                      opacity: answered && !isCorrectOpt && !isWrongPick ? 0.55 : 1,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 10,
                        fontFamily: "var(--f-pixel)",
                        fontSize: 9,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div className="h-display" style={{ fontSize: 18 }}>{opt}</div>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  border: `2px solid ${feedback.correct ? "var(--neon-lime)" : "var(--neon-mag)"}`,
                  background: feedback.correct ? "rgba(164,255,94,0.1)" : "rgba(255,62,165,0.1)",
                  color: feedback.correct ? "var(--neon-lime)" : "var(--neon-mag)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{feedback.correct ? "✨" : "💥"}</span>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{feedback.text}</div>
              </div>
            )}
          </div>

          {/* Action row */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              justifyContent: "space-between",
              flexWrap: "wrap",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="pill"
                style={{ cursor: answered ? "not-allowed" : "default", opacity: answered ? 0.5 : 1 }}
                disabled
              >
                💡 Hint
              </button>
              <button
                className="pill"
                style={{ cursor: answered ? "not-allowed" : "default", opacity: answered ? 0.5 : 1 }}
                disabled
              >
                ⏱ Slow-mo
              </button>
              <button
                onClick={skipQuestion}
                className="pill"
                style={{ cursor: answered ? "not-allowed" : "pointer", opacity: answered ? 0.5 : 1 }}
                disabled={answered}
              >
                ↻ Skip
              </button>
            </div>
            <button
              onClick={nextQuestion}
              disabled={!answered}
              className="chunky-btn"
              style={{
                cursor: answered ? "pointer" : "not-allowed",
                opacity: answered ? 1 : 0.45,
              }}
            >
              {currentIdx === questions.length - 1 ? "⚔ FINISH BATTLE" : "⚔ NEXT WAVE"}
            </button>
          </div>
        </div>
      )}

      {showResults && (
        <div className="panel cyan" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />

          <div style={{ textAlign: "center", marginBottom: 20, position: "relative" }}>
            <div style={{ fontSize: 72, lineHeight: 1 }} className="anim-bop">
              {totalAccuracy >= 80 ? "🏆" : totalAccuracy >= 50 ? "🎯" : "💪"}
            </div>
            <span className="label" style={{ color: "var(--neon-yel)" }}>BATTLE COMPLETE</span>
            <h2 className="h-display" style={{ fontSize: 32, margin: "8px 0 4px" }}>
              {totalAccuracy >= 80 ? "Victory!" : "Keep Training"}
            </h2>
            <p style={{ color: "var(--ink-dim)" }}>
              You dealt {score} of {questions.length} hits {totalAccuracy >= 80 ? "— boss defeated!" : "— the boss lives to fight again."}
            </p>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
              position: "relative",
            }}
          >
            <div className="panel" style={{ padding: 14, textAlign: "center" }}>
              <div className="label">Score</div>
              <div className="h-display" style={{ fontSize: 26, color: "var(--neon-cyan)", marginTop: 6 }}>
                {score}/{questions.length}
              </div>
            </div>
            <div className="panel" style={{ padding: 14, textAlign: "center" }}>
              <div className="label">Accuracy</div>
              <div className="h-display" style={{ fontSize: 26, color: "var(--neon-lime)", marginTop: 6 }}>
                {totalAccuracy}%
              </div>
            </div>
            <div className="panel" style={{ padding: 14, textAlign: "center" }}>
              <div className="label">Best Streak</div>
              <div className="h-display" style={{ fontSize: 26, color: "var(--neon-yel)", marginTop: 6 }}>
                {bestStreak}
              </div>
            </div>
          </div>

          {/* Accuracy bar */}
          <div style={{ marginBottom: 20, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="label" style={{ color: "var(--neon-yel)" }}>Mastery</span>
              <span className="label">{totalAccuracy}%</span>
            </div>
            <PixelBar value={totalAccuracy} color="var(--neon-yel)" />
          </div>

          {/* Question breakdown */}
          <div
            style={{
              padding: 16,
              background: "rgba(0,0,0,0.45)",
              border: "2px solid var(--line)",
              borderRadius: 12,
              marginBottom: 20,
              position: "relative",
            }}
          >
            <div className="label" style={{ color: "var(--neon-cyan)", marginBottom: 10 }}>
              Combat Log
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {answers.map((ans, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 4px",
                    borderBottom: i === answers.length - 1 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 900,
                      background: ans.correct ? "var(--neon-lime)" : "var(--neon-mag)",
                      color: "#170826",
                      flexShrink: 0,
                    }}
                  >
                    {ans.correct ? "✓" : "✗"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ans.q.slice(0, 60)}{ans.q.length > 60 ? "…" : ""}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--f-pixel)",
                      color: ans.correct ? "var(--neon-lime)" : "var(--neon-mag)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ans.correct ? ans.answer : ans.chosen}
                  </span>
                  {!ans.correct && (
                    <button
                      onClick={() => askTutorAbout(ans)}
                      title="Ask Byte to explain this concept"
                      className="pill"
                      style={{
                        fontSize: 10,
                        padding: "4px 10px",
                        cursor: "pointer",
                        color: "var(--neon-yel)",
                        borderColor: "var(--neon-yel)",
                        fontFamily: "var(--f-display)",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      🧠 Ask
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, position: "relative", flexWrap: "wrap" }}>
            <button
              onClick={() => handleSubjectFilter(subjectFilter)}
              className="chunky-btn cyan"
              style={{ flex: 1, minWidth: 160, cursor: "pointer" }}
            >
              ↻ TRY AGAIN
            </button>
            <button
              onClick={() => askTutorAbout()}
              className="chunky-btn yel"
              style={{ flex: 1, minWidth: 160, cursor: "pointer" }}
            >
              🧠 ASK AI TUTOR
            </button>
          </div>
        </div>
      )}

      {/* Recent scores strip */}
      {!showResults && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div className="panel" style={{ padding: 14 }}>
            <div className="label">Progress</div>
            <div className="h-display" style={{ fontSize: 18, marginTop: 2 }}>Questions</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-cyan)", marginTop: 6 }}>
              {currentIdx + (answered ? 1 : 0)}/{questions.length}
            </div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="label">Hits landed</div>
            <div className="h-display" style={{ fontSize: 18, marginTop: 2 }}>Correct</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-lime)", marginTop: 6 }}>
              {score}
            </div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="label">Combo</div>
            <div className="h-display" style={{ fontSize: 18, marginTop: 2 }}>Streak</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-yel)", marginTop: 6 }}>
              {streak}
            </div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="label">Accuracy</div>
            <div className="h-display" style={{ fontSize: 18, marginTop: 2 }}>Mastery</div>
            <div className="h-display" style={{ fontSize: 26, color: answers.length ? "var(--neon-ora)" : "var(--ink-mute)", marginTop: 6 }}>
              {answers.length ? `${accuracy}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Hidden references kept to avoid unused import warnings on subject styling maps */}
      <div style={{ display: "none" }}>
        {Object.values(SUBJECT_COLORS).join("")}
        {Object.values(SUBJECT_CLASSES).join("")}
      </div>
    </ArcadeShell>
  );
}
