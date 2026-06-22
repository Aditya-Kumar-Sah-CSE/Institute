/**
 * A lightweight, in-memory rate limiter for Next.js Server Actions.
 * Tracks usage by a string identifier (e.g., user ID or IP).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(identifier: string, limit: number, windowMs: number): { success: boolean; error?: string } {
  const now = Date.now();
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
