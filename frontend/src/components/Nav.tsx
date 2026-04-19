"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { apiDelete } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/learn", label: "Learn" },
  { href: "/learn", label: "AI Tutor" },
  { href: "/practice", label: "Practice" },
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
    if (href === "/analytics") return pathname.startsWith("/analytics");
    return pathname.startsWith(href);
  };

  const showNav = !loading && user && !['/', '/login', '/register'].includes(pathname);

  return (
    <>
      {/* eduai topbar — 54px height, bg-deep (#0a0d14) */}
      {showNav && (
        <nav className="sticky top-0 z-30 bg-[var(--bg-deep)] border-b border-[var(--border)] h-[54px] flex items-center px-6 gap-0">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-0 shrink-0 mr-8">
            <span className="text-[16px] font-[500] text-white tracking-tight">
              Learn<span className="text-[var(--accent)]">OS</span>
            </span>
          </Link>

          {/* Nav tabs — flex, align-center, 12px font-size */}
          <div className="flex items-center gap-0 flex-1">
            {NAV_TABS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "px-[14px] h-[54px] flex items-center gap-[7px] text-[12px] whitespace-nowrap border-b-2 transition-all duration-150",
                    active
                      ? "text-[var(--accent)] border-b-[#5b5eff]"
                      : "text-[var(--text-muted)] border-b-transparent hover:text-[var(--text-body)]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side — grade badge + avatar */}
          <div className="flex items-center gap-[10px] ml-auto">
            {/* Grade badge */}
            {profileGrade && (
              <div className="bg-[var(--accent-soft)] border border-[#3d3faa] rounded-full px-3 py-1 text-[11px] text-[var(--accent)] font-[500]">
                Grade {profileGrade}
              </div>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#3a3f55] text-[var(--accent)] hover:bg-[#1a1f2e] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-[#3d3faa] flex items-center justify-center text-[11px] font-[500] text-[var(--accent)] shrink-0">
                  {initials}
                </div>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-50">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#3d3faa] flex items-center justify-center text-sm font-[500] text-[var(--accent)] shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-[500] text-white truncate">{displayName}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{displayEmail}</p>
                      </div>
                    </div>
                  </div>

                  {!deleteConfirm ? (
                    <>
                      {/* Menu items */}
                      <div className="py-1.5">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-body)] hover:text-white hover:bg-[#1a1f2e] transition-colors"
                        >
                          Profile Details
                        </Link>
                        <Link
                          href="/analytics"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-body)] hover:text-white hover:bg-[#1a1f2e] transition-colors"
                        >
                          My Progress
                        </Link>
                        <Link
                          href="/learn"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-body)] hover:text-white hover:bg-[#1a1f2e] transition-colors"
                        >
                          My Subjects
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(true)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e24b4a] hover:text-[#f09595] hover:bg-[#2a1a1a] transition-colors text-left"
                        >
                          Delete Profile
                        </button>
                      </div>
                      {/* Sign out */}
                      <div className="border-t border-[var(--border)] py-1.5">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e24b4a] hover:text-[#f09595] hover:bg-[#2a1a1a] transition-colors text-left"
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
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] text-[var(--text-body)] hover:bg-[#1a1f2e] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteProfile}
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-[#e24b4a] hover:bg-[#f09595] text-white font-[500] transition-colors"
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
