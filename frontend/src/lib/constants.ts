export const APP_NAME = "LearnOS";
export const API_URL = "/api/proxy";
export const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");

export const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export const BOARDS = ["CBSE", "ICSE", "Cambridge IGCSE", "IB", "Common Core", "Other"];

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "English",
  "Computer Science",
  "Economics",
  "Political Science",
  "Psychology",
  "Art",
];

export const SUBJECT_EMOJIS: Record<string, string> = {
  Mathematics: "📐",
  Physics: "⚛️",
  Chemistry: "🧪",
  Biology: "🌿",
  History: "📜",
  Geography: "🌍",
  English: "📖",
  "Computer Science": "💻",
  Economics: "📊",
  "Political Science": "🏛️",
  Psychology: "🧠",
  Art: "🎨",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  engaged: "bg-green-400",
  happy: "bg-green-300",
  confused: "bg-yellow-400",
  bored: "bg-orange-400",
  frustrated: "bg-red-400",
  drowsy: "bg-gray-400",
};

export const SENTIMENT_LABELS: Record<string, string> = {
  engaged: "Engaged",
  happy: "Happy",
  confused: "Confused",
  bored: "Bored",
  frustrated: "Frustrated",
  drowsy: "Drowsy",
};

export const SENTIMENT_FRAME_INTERVAL_MS = 5000;
export const MAX_CHAT_HISTORY = 50;
