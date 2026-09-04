'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearOfflineCache } from '@/lib/cache/offlineDb';

if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const fullText = args
      .map((a) => {
        if (!a) return '';
        if (typeof a === 'string') return a;
        if (a instanceof Error) return `${a.message} ${a.stack || ''}`;
        if (typeof Event !== 'undefined' && a instanceof Event) {
          const ev = a as ErrorEvent;
          return `[${ev.type || 'Event'}] ${ev.message || (ev.target as HTMLElement)?.tagName || 'Resource error'}`;
        }
        try {
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');

    if (
      fullText.includes('We are cleaning up async info that was not on the parent Suspense boundary') ||
      fullText.includes('removePreviousSuspendedBy') ||
      fullText.includes('fdprocessedid') ||
      fullText.includes('hydration mismatch') ||
      fullText.includes('ERR Canceled') ||
      fullText.includes('Canceled: Canceled') ||
      fullText.includes('Operation Canceled') ||
      fullText.includes('The user aborted a request') ||
      fullText.includes('object ErrorEvent') ||
      fullText.includes('ErrorEvent') ||
      fullText.includes('Script error.')
    ) {
      return;
    }
    originalError(...args);
  };

  window.addEventListener(
    'error',
    (event) => {
      const isResourceError = event.target && event.target !== window && event.target instanceof HTMLElement;
      const isScriptError = event.message === 'Script error.' || !event.error;
      const isErrorEventObj = String(event.error || '').includes('ErrorEvent') || String(event.message || '').includes('ErrorEvent');

      if (isResourceError || isScriptError || isErrorEventObj) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let msg = '';
    let name = '';

    if (typeof reason === 'string') {
      msg = reason;
    } else if (reason instanceof Error) {
      msg = reason.message;
      name = reason.name;
    } else if (typeof Event !== 'undefined' && reason instanceof Event) {
      const ev = reason as ErrorEvent;
      msg = ev.message || 'ErrorEvent';
      name = ev.type || 'ErrorEvent';
    } else if (reason && typeof reason === 'object') {
      msg = reason.message || reason.error?.message || String(reason);
      name = reason.name || reason.error?.name || '';
    } else {
      msg = String(reason || '');
    }

    if (
      msg.includes('Canceled') ||
      msg.includes('ERR Canceled') ||
      msg.includes('object ErrorEvent') ||
      msg.includes('ErrorEvent') ||
      msg.includes('Script error') ||
      name === 'Canceled' ||
      name === 'AbortError' ||
      name === 'ErrorEvent'
    ) {
      event.preventDefault();
    }
  });
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
