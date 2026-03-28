"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    href: "/learn",
    label: "Subjects",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/courses",
    label: "Courses",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2L1.5 5.5l6.5 3.5 6.5-3.5L8 2z" fill="currentColor" opacity="0.85" />
        <path d="M1.5 9.5L8 13l6.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M1.5 7L8 10.5 14.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.4" />
      </svg>
    ),
  },
  {
    href: "/video-session",
    label: "Videos",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M11 6.5l3-2v7l-3-2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    href: "/tutor",
    label: "AI Tutor",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12l3.5-4 3 2.5 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
] as const;

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  async function handleSignOut() {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  // Get initials from email
  const initials = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "Account";
  const displayEmail = user?.email ?? "";

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-3 shrink-0 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:shadow-blue-700/50 transition-shadow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2L2 6.5l7 4.5 7-4.5L9 2z" fill="white" opacity="0.9" />
              <path d="M2 11l7 4.5L16 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-bold text-white text-sm tracking-tight">LearnOS</p>
            <p className="text-[10px] text-white/40 -mt-0.5">AI personalized learning</p>
          </div>
        </Link>

        {/* Nav links — only on app pages (not marketing/auth) */}
        {!loading && user && !['/', '/login', '/register'].includes(pathname) && (
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                      : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                  )}
                >
                  <span className={active ? "text-white" : "text-white/50"}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!loading && (
            user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Profile trigger */}
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150",
                    dropdownOpen
                      ? "bg-white/[0.08] border-white/20 text-white"
                      : "text-white/60 hover:text-white border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  {/* Avatar circle */}
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <span className="hidden sm:block">Profile</span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={cn("transition-transform duration-200", dropdownOpen ? "rotate-180" : "")}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-[#0d1628] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3.5 border-b border-white/[0.07]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                          <p className="text-xs text-white/40 truncate">{displayEmail}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                          <path d="M2 13c0-3.038 2.462-5.5 5.5-5.5S13 9.962 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                        </svg>
                        Profile Details
                      </Link>
                      <Link
                        href="/analytics"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2 11l3-3.5 2.5 2L10 5l3 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                        My Progress
                      </Link>
                      <Link
                        href="/learn"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2 3a1 1 0 011-1h9a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.3" fill="none" />
                          <path d="M5 6h5M5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        My Subjects
                      </Link>
                      <Link
                        href="/onboarding"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                          <path d="M7.5 5v2.5l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        Edit Preferences
                      </Link>
                    </div>

                    {/* Divider + sign out */}
                    <div className="border-t border-white/[0.07] py-1.5">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-white/60 hover:text-white px-4 py-2 rounded-lg hover:bg-white/[0.06] transition-colors font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40"
                >
                  Get started
                </Link>
              </>
            )
          )}
        </div>

      </div>
    </nav>
  );
}
