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
    label: "Home",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L1.5 5l6.5 3.5L14.5 5 8 1.5z" fill="currentColor" opacity="0.9" />
        <path d="M1.5 9.5L8 13l6.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.55" />
        <path d="M1.5 7L8 10.5 14.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.3" />
      </svg>
    ),
  },
  {
    href: "/session",
    label: "Session",
    isAI: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/path",
    label: "Path",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M6 7l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Insights",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 11.5l3-3.5 2.5 2 3-5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="2" cy="11.5" r="1" fill="currentColor" opacity="0.7" />
        <circle cx="13" cy="8.5" r="1" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close both menus on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "Account";
  const displayEmail = user?.email ?? "";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/session") return pathname.startsWith("/session") || pathname.startsWith("/tutor") || pathname.startsWith("/practice") || pathname.startsWith("/video-session") || pathname.startsWith("/voice");
    if (href === "/path") return pathname.startsWith("/path") || pathname.startsWith("/learn");
    if (href === "/analytics") return pathname.startsWith("/analytics");
    return pathname.startsWith(href);
  };

  const showNav = !loading && user && !['/', '/login', '/register'].includes(pathname);

  return (
    <>
      <nav className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-all duration-200">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L2 6.5l7 4.5 7-4.5L9 2z" fill="white" opacity="0.9" />
                <path d="M2 11l7 4.5L16 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="font-bold text-white text-sm tracking-tight">LearnOS</p>
              <p className="text-[10px] text-white/40 -mt-0.5 hidden sm:block">AI personalized learning</p>
            </div>
          </Link>

          {/* Desktop nav links */}
          {showNav && (
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {NAV_LINKS.map(({ href, label, icon, isAI }) => {
                const active = isActive(href);
                if (isAI) {
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-900/50"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06] hover:scale-[1.02]"
                      )}
                    >
                      {!active && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                        </span>
                      )}
                      <span className={active ? "text-white" : "text-violet-400"}>{icon}</span>
                      {label}
                      {!active && <span className="text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">AI</span>}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.06] hover:scale-[1.02]"
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
                <>
                  {/* Desktop profile dropdown */}
                  <div className="relative hidden md:block" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen((o) => !o)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200",
                        dropdownOpen
                          ? "bg-white/[0.08] border-white/20 text-white"
                          : "text-white/60 hover:text-white border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <span>Profile</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn("transition-transform duration-200", dropdownOpen ? "rotate-180" : "")}>
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-60 bg-[#0d1628] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-4 py-3.5 border-b border-white/[0.07]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">{initials}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                              <p className="text-xs text-white/40 truncate">{displayEmail}</p>
                            </div>
                          </div>
                        </div>
                        <div className="py-1.5">
                          <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors">Profile Details</Link>
                          <Link href="/analytics" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors">My Progress</Link>
                          <Link href="/path" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors">Learning Path</Link>
                          <Link href="/session" className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors">Start Learning</Link>
                        </div>
                        <div className="border-t border-white/[0.07] py-1.5">
                          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors">Sign Out</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile hamburger */}
                  {showNav && (
                    <button
                      onClick={() => setMobileMenuOpen((o) => !o)}
                      className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                      aria-label="Toggle menu"
                    >
                      {mobileMenuOpen ? (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors font-medium">Sign in</Link>
                  <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40">Get started</Link>
                </>
              )
            )}
          </div>

        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && showNav && (
        <div className="md:hidden fixed inset-0 z-20 top-16">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />

          {/* Slide-in panel */}
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#0a0f1e] border-l border-white/[0.08] flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">

            {/* User info */}
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">{initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-white/40 truncate">{displayEmail}</p>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 py-3">
              {NAV_LINKS.map(({ href, label, icon, isAI }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all",
                      active
                        ? isAI
                          ? "bg-violet-600/20 text-violet-300 border-r-2 border-violet-500"
                          : "bg-blue-600/20 text-blue-300 border-r-2 border-blue-500"
                        : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <span className={cn("shrink-0", active ? (isAI ? "text-violet-400" : "text-blue-400") : "text-white/40")}>{icon}</span>
                    {label}
                    {isAI && !active && (
                      <span className="ml-auto text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">AI</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="border-t border-white/[0.07] py-3 space-y-0.5">
              <Link href="/profile" className="flex items-center gap-3 px-5 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">Profile</Link>
              <Link href="/preferences" className="flex items-center gap-3 px-5 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">Preferences</Link>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors">Sign Out</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
