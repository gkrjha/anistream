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
      const hit = await redis.get<T>(key);
      if (hit !== null && hit !== undefined) return hit;
      const data = await fn();
      await redis.set(key, data, { ex: ttlSeconds });
      return data;
    } catch {
      // Redis error → fallback to direct fetch
      return fn();
    }
  }

  // In-memory fallback
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const data = await fn();
  cacheSet(key, data, ttlSeconds);
  return data;
}
