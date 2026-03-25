import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Session token cache ───────────────────────────────────────────────────
// Avoids calling supabase.auth.getSession() on every single API request.
// Tokens are cached for 4 minutes (well within the 1h Supabase expiry).
let _sessionCache: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (_sessionCache && now < _sessionCache.expiresAt) {
    return _sessionCache.token;
  }
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }
  if (!session?.access_token) throw new ApiError(401, "Not authenticated");
  _sessionCache = { token: session.access_token, expiresAt: now + 4 * 60 * 1000 };
  return session.access_token;
}

// Invalidate session cache on sign-out
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") _sessionCache = null;
});

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ─── GET response cache ────────────────────────────────────────────────────
// Caches API responses in memory to avoid redundant fetches across page
// navigations in the same session.
interface CacheEntry { data: unknown; expiresAt: number }
const _cache = new Map<string, CacheEntry>();

/** Invalidate cached entries whose path starts with the given prefix.
 *  Call with no argument to clear everything (e.g. on sign-out). */
export function invalidateCache(pathPrefix?: string) {
  if (!pathPrefix) { _cache.clear(); return; }
  for (const key of _cache.keys()) {
    if (key.startsWith(pathPrefix)) _cache.delete(key);
  }
}

// ─── HTTP methods ──────────────────────────────────────────────────────────

/**
 * @param ttlMs  How long to cache this response (default 30 s).
 *               Pass 0 to skip caching.
 */
export async function apiGet<T>(path: string, ttlMs = 30_000): Promise<T> {
  if (ttlMs > 0) {
    const cached = _cache.get(path);
    if (cached && Date.now() < cached.expiresAt) return cached.data as T;
  }

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `API error: ${res.status}`);
  }
  const data = await res.json();
  if (ttlMs > 0) _cache.set(path, { data, expiresAt: Date.now() + ttlMs });
  return data as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `API error: ${res.status}`);
  }
  return res.json();
}
