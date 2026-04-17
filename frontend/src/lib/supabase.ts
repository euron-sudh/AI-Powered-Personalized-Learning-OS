import { createBrowserClient } from "@supabase/ssr";

// Lazily create the client so it is only initialised in the browser
// (avoids SSR crashes when env vars are read at module-evaluation time).
let _client: ReturnType<typeof createBrowserClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
          persistSession: true,
        },
      }
    );
  }
  return _client;
}

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return getClient()[prop as keyof ReturnType<typeof createBrowserClient>];
  },
});
