"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import type { StudentProfile } from "@/types/student";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    apiGet<StudentProfile>("/api/onboarding/profile")
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const initials = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name ?? profile?.name ?? user?.email ?? "Student";

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        <h1 className="text-2xl font-bold text-white">Profile</h1>

        {/* Avatar + name */}
        <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{displayName}</p>
            <p className="text-sm text-white/40">{user?.email}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active student
            </span>
          </div>
        </div>

        {/* Account details */}
        <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-semibold text-white">Account Details</h2>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="Name" value={profile?.name ?? displayName} />
            <Row label="Grade" value={profile?.grade ?? "—"} />
            <Row label="Board" value={(profile as any)?.board ?? "—"} />
            <Row label="Member since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
          </div>
        </div>

        {/* Learning info */}
        {profile && (
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-white">Learning Profile</h2>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {profile.interests && profile.interests.length > 0 && (
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <span className="text-sm text-white/40 shrink-0">Interests</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {profile.interests.map((interest) => (
                      <span key={interest} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.background && (
                <div className="px-6 py-4 flex items-start justify-between gap-4">
                  <span className="text-sm text-white/40 shrink-0">Background</span>
                  <span className="text-sm text-white/70 text-right max-w-xs">{profile.background}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-semibold text-white">Actions</h2>
          </div>
          <div className="divide-y divide-white/[0.05]">
            <ActionRow
              label="Edit Preferences"
              description="Update your grade, subjects, and learning goals"
              href="/onboarding"
            />
            <ActionRow
              label="View Analytics"
              description="See your learning progress and scores"
              href="/analytics"
            />
            <ActionRow
              label="My Subjects"
              description="Browse and continue your enrolled subjects"
              href="/learn"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm text-white/80 text-right">{value}</span>
    </div>
  );
}

function ActionRow({ label, description, href }: { label: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors group"
    >
      <div>
        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{label}</p>
        <p className="text-xs text-white/30 mt-0.5">{description}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors">
        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
