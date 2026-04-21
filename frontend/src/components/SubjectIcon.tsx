"use client";

import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  Leaf,
  Library,
  Microscope,
  Music,
  Palette,
  PenTool,
  Sigma,
  type LucideProps,
} from "lucide-react";

const SUBJECT_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  mathematics: Sigma,
  math: Calculator,
  algebra: Sigma,
  geometry: Sigma,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  science: Microscope,
  "computer science": Code2,
  coding: Code2,
  programming: Code2,
  english: BookOpen,
  literature: BookOpen,
  history: Landmark,
  geography: Globe,
  social: Globe,
  "social studies": Globe,
  arts: Palette,
  art: Palette,
  music: Music,
  language: Languages,
  hindi: Languages,
  spanish: Languages,
  french: Languages,
  psychology: Brain,
  "general knowledge": Library,
  gk: Library,
};

interface SubjectIconProps extends LucideProps {
  subject: string;
  fallback?: React.ComponentType<LucideProps>;
}

export function SubjectIcon({
  subject,
  fallback = GraduationCap,
  ...rest
}: SubjectIconProps) {
  const key = (subject || "").toLowerCase().trim();
  const Icon = SUBJECT_ICON_MAP[key] || fallback;
  return <Icon {...rest} />;
}

export { PenTool };
