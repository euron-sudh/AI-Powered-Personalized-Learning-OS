"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-[var(--text-muted)] mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[#3d3faa] transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
