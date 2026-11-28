import 'server-only';
import { cache } from 'react';
import { createHash } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface VerifiedUserCacheEntry {
  user: any;
  expiresAt: number;
}

const AUTH_CACHE_MAX = 3000;
const AUTH_CACHE_TTL_MS = 12_000;

const globalAuthStore = globalThis as unknown as {
  __sbUserCache?: Map<string, VerifiedUserCacheEntry>;
  __sbUserInFlight?: Map<string, Promise<any>>;
};
if (!globalAuthStore.__sbUserCache) globalAuthStore.__sbUserCache = new Map();
if (!globalAuthStore.__sbUserInFlight) globalAuthStore.__sbUserInFlight = new Map();

function extractJwtExpMs(cookieValues: string[]): number | null {
  for (const raw of cookieValues) {
    try {
      let token = raw;
      if (raw.startsWith('base64-')) {
        token = Buffer.from(raw.slice(7), 'base64url').toString('utf8');
      }
      if (token.startsWith('{') || token.startsWith('[')) {
        const parsed = JSON.parse(token);
        const jwt = typeof parsed?.access_token === 'string' ? parsed.access_token : Array.isArray(parsed) ? parsed[0] : '';
        if (typeof jwt === 'string' && jwt.includes('.')) token = jwt;
      }
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (typeof payload?.exp === 'number') return payload.exp * 1000;
      }
    } catch {
      // Ignore malformed chunks
    }
  }
  return null;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored
          }
        },
      },
    }
  );
}

export const getUser = cache(async () => {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(
      (c) => c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.startsWith('supabase-')
    );
    if (authCookies.length === 0) {
      return null;
    }

    const digestInput = authCookies
      .map((c) => `${c.name}=${c.value}`)
      .sort()
      .join(';');
    const tokenKey = createHash('sha256').update(digestInput).digest('base64url');
    const now = Date.now();
    const cached = globalAuthStore.__sbUserCache!.get(tokenKey);
    if (cached && now < cached.expiresAt) {
      return cached.user;
    }
    if (cached) {
      globalAuthStore.__sbUserCache!.delete(tokenKey);
    }

    const existingFlight = globalAuthStore.__sbUserInFlight!.get(tokenKey);
    if (existingFlight) {
      return await existingFlight;
    }

    const lookupPromise = (async () => {
      try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;

        const jwtExpMs = extractJwtExpMs(authCookies.map((c) => c.value));
        const maxExp = jwtExpMs ? Math.min(Date.now() + AUTH_CACHE_TTL_MS, jwtExpMs) : Date.now() + AUTH_CACHE_TTL_MS;
        if (maxExp > Date.now()) {
          if (globalAuthStore.__sbUserCache!.size >= AUTH_CACHE_MAX) {
            const firstKey = globalAuthStore.__sbUserCache!.keys().next().value;
            if (firstKey) globalAuthStore.__sbUserCache!.delete(firstKey);
          }
          globalAuthStore.__sbUserCache!.set(tokenKey, { user, expiresAt: maxExp });
        }
        return user;
      } catch {
        return null;
      } finally {
        globalAuthStore.__sbUserInFlight!.delete(tokenKey);
      }
    })();

    globalAuthStore.__sbUserInFlight!.set(tokenKey, lookupPromise);
    return await lookupPromise;
  } catch {
    return null;
  }
});

export async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
