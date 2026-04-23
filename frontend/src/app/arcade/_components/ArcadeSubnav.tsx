"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/arcade", label: "Dashboard" },
  { href: "/arcade/learn", label: "Learn" },
  { href: "/arcade/lesson", label: "Lesson" },
  { href: "/arcade/practice", label: "Practice" },
  { href: "/arcade/buddy", label: "Buddy" },
  { href: "/arcade/leaderboard", label: "Arena" },
  { href: "/arcade/onboarding", label: "Onboarding" },
  { href: "/arcade/login", label: "Login" },
];

export default function ArcadeSubnav() {
  const pathname = usePathname();
  return (
    <nav className="arcade-subnav">
      <span
        className="label"
        style={{ color: "var(--neon-mag)", alignSelf: "center", marginRight: 8 }}
      >
        Arcade preview
      </span>
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
