'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearOfflineCache } from '@/lib/cache/offlineDb';

if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('We are cleaning up async info that was not on the parent Suspense boundary') ||
       msg.includes('removePreviousSuspendedBy'))
    ) {
      return;
    }
    originalError(...args);
  };
}

export default function AuthChangeHandler() {
  const lastUserRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Get current user initial state
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        lastUserRef.current = data.user.id;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth event: ${event}`);

      if (session?.user) {
        lastUserRef.current = session.user.id;
      }

      if (event === 'SIGNED_OUT') {
        const userId = lastUserRef.current;
        if (userId) {
          console.log(`User ${userId} logged out, purging private client-side databases...`);
          
          // 1. Wipe IndexedDB cache (user-specific offline data)
          await clearOfflineCache(userId);
          lastUserRef.current = null;
        }

        // 2. Clear ONLY auth-related localStorage keys.
        //    DO NOT call localStorage.clear() — it nukes SW reload guards,
        //    theme prefs, and the sw_reloaded_for key that prevents reload loops.
        try {
          const authKeyPrefixes = ['sb-', 'supabase.auth.', 'supabase-'];
          Object.keys(localStorage).forEach((key) => {
            if (authKeyPrefixes.some((p) => key.startsWith(p))) {
              localStorage.removeItem(key);
            }
          });
          // Only clear auth-related sessionStorage keys too
          Object.keys(sessionStorage).forEach((key) => {
            if (authKeyPrefixes.some((p) => key.startsWith(p))) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (_) {}

        // 3. Navigate to /login for a clean start
        //    (No full location.reload — the normal navigation is enough)
        window.location.href = '/login';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
