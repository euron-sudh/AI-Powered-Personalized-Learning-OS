"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { apiDelete } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GraduationCap } from "lucide-react";

const NAV_TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/learn", label: "AI Tutor" },
  { href: "/practice", label: "Practice" },
  { href: "/review", label: "Review" },
  { href: "/buddy", label: "Buddy" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/analytics", label: "Progress" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileGrade, setProfileGrade] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setDeleteConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchNavData = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const headers = { Authorization: `Bearer ${session.access_token}` };

          const profileRes = await fetch(`/api/proxy/api/onboarding/profile`, { headers });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile?.name) setProfileName(profile.name);
            if (profile?.grade) setProfileGrade(profile.grade);
          }
        } catch (err) {
          console.error("Failed to fetch nav data:", err);
        }
      };
      fetchNavData();
    }
  }, [user]);

  useEffect(() => {
    setDropdownOpen(false);
    setDeleteConfirm(false);
  }, [pathname]);

  async function handleSignOut() {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteProfile() {
    try {
      await apiDelete("/onboarding/profile");
    } catch (e) {
      console.error("Failed to delete profile:", e);
    } finally {
      await supabase.auth.signOut();
      router.push("/");
    }
  }

  const initials = (profileName ?? user?.email ?? "U")[0].toUpperCase();
  const displayName = profileName ?? user?.user_metadata?.full_name ?? user?.email ?? "Account";
  const displayEmail = user?.email ?? "";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/learn") return pathname.startsWith("/learn");
    if (href === "/practice") return pathname.startsWith("/practice");
    if (href === "/review") return pathname.startsWith("/review");
    if (href === "/buddy") return pathname.startsWith("/buddy");
    if (href === "/leaderboard") return pathname.startsWith("/leaderboard");
    if (href === "/analytics") return pathname.startsWith("/analytics");
    return pathname.startsWith(href);
  };

  // Arcade-migrated routes render their own TopBar, so suppress the global Nav.
  const ARCADE_MIGRATED_PREFIXES = [
    '/arcade',
    '/dashboard',
    '/learn',
    '/practice',
    '/buddy',
    '/leaderboard',
    '/onboarding',
    '/analytics',
    '/profile',
    '/career',
    '/podcast',
    '/project',
    '/review',
    '/scan',
    '/story',
    '/focus',
    '/sim',
    '/parent',
    '/path',
    '/insights',
    '/sentiment',
    '/preferences',
    '/voice',
    '/video-session',
    '/courses',
    '/forgot-password',
  ];
  const isArcadeRoute = ARCADE_MIGRATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const showNav = !loading && user && !['/', '/login', '/register'].includes(pathname) && !isArcadeRoute;

  return (
    <>
      {/* BrightLearn topbar — white, 64px, soft shadow */}
      {showNav && (
        <nav className="sticky top-0 z-30 bg-white border-b border-[var(--border)] h-[64px] flex items-center px-6 gap-0 shadow-card">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] flex items-center justify-center shadow-card">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-[18px] font-extrabold tracking-tight">
              <span className="text-[var(--text-primary)]">Learn</span>
              <span className="text-[var(--brand-blue)]">OS</span>
            </span>
          </Link>

          {/* Nav tabs */}
          <div className="flex items-center gap-1 flex-1">
            {NAV_TABS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "px-4 h-[64px] flex items-center text-[13px] font-semibold whitespace-nowrap border-b-2 transition-all duration-150",
                    active
                      ? "text-[var(--brand-blue)] border-b-[var(--brand-blue)]"
                      : "text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side — grade badge + avatar */}
          <div className="flex items-center gap-3 ml-auto">
            {profileGrade && (
              <div className="bg-[var(--brand-blue-soft)] rounded-full px-3.5 py-1.5 text-[12px] text-[var(--brand-blue)] font-bold">
                Grade {profileGrade}
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-[var(--bg-deep)] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-card">
                  {initials}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-[var(--border)] rounded-2xl shadow-elevated overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-deep)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{displayName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{displayEmail}</p>
                      </div>
                    </div>
                  </div>

                  {!deleteConfirm ? (
                    <>
                      <div className="py-1.5">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-deep)] transition-colors"
                        >
                          Profile Details
                        </Link>
                        <Link
                          href="/analytics"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-deep)] transition-colors"
                        >
                          My Progress
                        </Link>
                        <Link
                          href="/learn"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-deep)] transition-colors"
                        >
                          My Subjects
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(true)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors text-left"
                        >
                          Delete Profile
                        </button>
                      </div>
                      <div className="border-t border-[var(--border)] py-1.5">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors text-left"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-3.5 space-y-3">
                      <p className="text-sm text-[var(--text-body)]">Delete your profile? All progress will be lost.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(false)}
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--bg-deep)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteProfile}
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-[var(--red)] hover:opacity-90 text-white font-semibold transition-colors"
                        >
                          Yes, delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
