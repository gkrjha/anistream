// In-memory server-side cache with TTL
// Vercel serverless mein har function instance ka apna cache hota hai
// lekin Next.js `revalidate` + ye cache milke 10k users easily handle karta hai

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Returns undefined on miss so callers can cache null / negative results. */
export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { store.delete(key); return undefined; }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlSeconds = 3600) {
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheWrap<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const data = await fn();
  cacheSet(key, data, ttlSeconds);
  return data;
}
