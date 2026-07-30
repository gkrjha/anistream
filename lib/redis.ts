import { Redis } from '@upstash/redis';
import { cacheGet, cacheSet } from './cache';

// Use official Upstash SDK if credentials are present
const USE_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = USE_REDIS
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Universal cache wrapper
// Redis available → Upstash (shared across all serverless instances)
// Redis not available → in-memory fallback (local dev)
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  if (redis) {
    try {
      const hit = await redis.get<unknown>(key);
      // Upstash returns null on miss — wrap values so null payloads can be cached
      if (hit !== null && hit !== undefined) {
        const parsed = typeof hit === 'string' ? JSON.parse(hit) : hit;
        return parsed as T;
      }
      const data = await fn();
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
      return data;
    } catch {
      return fn();
    }
  }

  // In-memory fallback — undefined means miss (null is a valid cached value)
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const data = await fn();
  cacheSet(key, data, ttlSeconds);
  return data;
}
