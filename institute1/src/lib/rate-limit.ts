/**
 * A lightweight, in-memory rate limiter for Next.js Server Actions.
 * Tracks usage by a string identifier (e.g., user ID or IP).
 * Includes periodic cleanup to prevent memory leaks.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();
let checkCounter = 0;
const CLEANUP_INTERVAL = 100; // Clean up every 100 checks

// Periodically purge expired entries to prevent memory leak
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string, limit: number, windowMs: number): { success: boolean; error?: string } {
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
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true };
  }

  // If they exceeded the limit
  if (entry.count >= limit) {
    const waitSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { 
      success: false, 
      error: `You are doing this too often. Please wait ${waitSeconds} seconds.` 
    };
  }

  // Increment their count
  entry.count += 1;
  store.set(identifier, entry);

  return { success: true };
}
