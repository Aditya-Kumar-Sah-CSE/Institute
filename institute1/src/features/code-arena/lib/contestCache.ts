import type { UnifiedContest } from '@/app/api/coding/contests/route';

export const CONTESTS_CACHE_KEY = 'smartlearn:contests:v1';
export const CONTESTS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CachedContestsPayload {
  data: UnifiedContest[];
  cachedAt: number;
}

export interface ContestCacheResult {
  data: UnifiedContest[];
  isStale: boolean;
  ageMs: number;
}

/**
 * Safely reads contest data from browser localStorage.
 */
export function loadContestsCache(): ContestCacheResult | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CONTESTS_CACHE_KEY);
    if (!raw) return null;

    const parsed: CachedContestsPayload = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.cachedAt !== 'number') {
      return null;
    }

    const now = Date.now();
    const ageMs = Math.max(0, now - parsed.cachedAt);
    const isStale = ageMs > CONTESTS_CACHE_TTL_MS;

    return {
      data: parsed.data,
      isStale,
      ageMs,
    };
  } catch (err) {
    console.warn('[contestCache] Failed to parse localStorage cache:', err);
    return null;
  }
}

/**
 * Safely saves contest data to browser localStorage.
 */
export function saveContestsCache(contests: UnifiedContest[]): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: CachedContestsPayload = {
      data: contests,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CONTESTS_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[contestCache] Failed to write to localStorage:', err);
  }
}

/**
 * Safely clears contest cache.
 */
export function clearContestsCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CONTESTS_CACHE_KEY);
  } catch (err) {
    console.warn('[contestCache] Failed to remove localStorage cache:', err);
  }
}

// In-flight fetch deduplication to prevent simultaneous duplicate API requests
let inFlightFetch: Promise<UnifiedContest[]> | null = null;

/**
 * Fetches fresh contest data from API with request deduplication.
 */
export async function fetchFreshContests(): Promise<UnifiedContest[]> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const res = await fetch('/api/coding/contests', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`API response status ${res.status}`);
      }
      const json = await res.json();
      const contests: UnifiedContest[] = Array.isArray(json.contests) ? json.contests : [];
      saveContestsCache(contests);
      return contests;
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}
