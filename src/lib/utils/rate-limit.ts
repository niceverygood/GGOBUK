/**
 * Simple in-memory sliding-window rate limiter.
 *
 * On Vercel serverless each instance keeps its own window, so this is
 * best-effort per warm instance. For stricter global limits, swap the
 * store for Upstash Redis (`@upstash/ratelimit`).
 */

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Check and consume one request for `key`.
 * @param key   unique identifier (e.g. `userId` or `ip:route`)
 * @param limit max requests per window
 * @param windowMs window duration in ms (default 60 000 = 1 min)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

/** Build a rate-limit key from user ID and route name. */
export function rateLimitKey(userId: string, route: string): string {
  return `${userId}:${route}`;
}
