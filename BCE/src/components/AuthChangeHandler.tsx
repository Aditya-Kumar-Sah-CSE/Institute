'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearOfflineCache } from '@/lib/cache/offlineDb';

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

      if (event === 'SIGNED_OUT' || !session?.user) {
        const userId = lastUserRef.current;
        if (userId) {
          console.log(`User ${userId} logged out, purging private client-side databases...`);
          
          // 1. Wipe IndexedDB cache
          await clearOfflineCache(userId);
          lastUserRef.current = null;
        }

        // 2. Wipe PWA caches
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
            console.log('Static PWA cache stores evicted successfully.');
          } catch (cacheErr) {
            console.error('Failed to clear static PWA cache stores:', cacheErr);
          }
        }

        // 3. Wipe sessionStorage/localStorage settings
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (storageErr) {}

        // 4. Force a clean refresh to dump React router memory
        window.location.href = '/login';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
