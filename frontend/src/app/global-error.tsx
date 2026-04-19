"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html>
      <body className="bg-[var(--bg-base)]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">Application Error</h1>
            <p className="text-[var(--text-muted)] mb-6">{error.message}</p>
            <button
              onClick={() => reset()}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[#3d3faa] transition"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
