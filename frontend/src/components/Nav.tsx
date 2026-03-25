"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tutor", label: "AI Tutor" },
  { href: "/analytics", label: "Analytics" },
] as const;

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSupabaseAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <span className="font-bold text-slate-800 tracking-tight">LearnOS</span>
        </Link>

        {/* Nav links — desktop only */}
        {!loading && user && (
          <div className="hidden sm:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  pathname === href
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!loading && (
            user ? (
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors duration-150 font-medium"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-slate-900 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-slate-700 transition-colors shadow-sm"
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
