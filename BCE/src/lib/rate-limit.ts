/**
 * In-Memory Rate Limiter with Tiered Presets
 * 
 * Tracks usage by string identifier (user ID, IP, or compound key).
 * Includes periodic cleanup to prevent memory leaks.
 * Provides named tier presets for different endpoint risk levels.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();
let checkCounter = 0;
const CLEANUP_INTERVAL = 100;

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// ─── Tiered Presets ───

export type RateLimitTier = 'standard' | 'sensitive' | 'heavy' | 'auth' | 'compiler';

export const RATE_LIMIT_TIERS: Record<RateLimitTier, { limit: number; windowMs: number }> = {
  /** General API endpoints: 60 requests per minute */
  standard: { limit: 60, windowMs: 60_000 },
  /** Sensitive endpoints (delete, admin ops): 15 per minute */
  sensitive: { limit: 15, windowMs: 60_000 },
  /** Heavy/expensive endpoints (AI, reports): 5 per minute */
  heavy: { limit: 5, windowMs: 60_000 },
  /** Auth endpoints (login, signup, password reset): 10 per 5 minutes */
  auth: { limit: 10, windowMs: 300_000 },
  /** Code compiler execution: 60 per minute */
  compiler: { limit: 60, windowMs: 60_000 },
};

// ─── Core Rate Limiter ───

export interface RateLimitResult {
  success: boolean;
  error?: string;
  resetAt?: number;
  remaining?: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Run cleanup periodically
  checkCounter++;
  if (checkCounter >= CLEANUP_INTERVAL) {
    checkCounter = 0;
    cleanupExpired();
  }

  const entry = store.get(identifier);

  // If no entry exists or the window has expired, reset it.
  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  // If they exceeded the limit
  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      error: `Too many requests. Please wait ${retryAfterSeconds} seconds.`,
      resetAt: entry.resetAt,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Increment their count
  entry.count += 1;
  store.set(identifier, entry);

  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Convenience: check rate limit using a named tier preset.
 */
export function checkRateLimitByTier(identifier: string, tier: RateLimitTier): RateLimitResult {
  const config = RATE_LIMIT_TIERS[tier];
  return checkRateLimit(identifier, config.limit, config.windowMs);
}
