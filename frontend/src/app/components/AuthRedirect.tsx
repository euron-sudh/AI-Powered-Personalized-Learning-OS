"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function AuthRedirect() {
  const { user, session, loading } = useSupabaseAuth();
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || loading || !user || !session) return;
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) return;
    fired.current = true;
    router.replace("/dashboard");
  }, [user, session, loading, router]);

  return null;
}
