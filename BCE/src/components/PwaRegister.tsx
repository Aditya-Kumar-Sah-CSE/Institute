'use client';

import { useEffect } from 'react';

/**
 * ROOT CAUSE 3 FIX — PWA reload loop guard
 *
 * The previous implementation used an in-memory `reloading` flag which is
 * reset whenever the component remounts (React Strict Mode, fast-refresh,
 * effect teardown + re-run). This meant `controllerchange` could fire
 * `window.location.reload()` repeatedly, creating a reload loop.
 *
 * Fix: persist the reload timestamp to sessionStorage so the cooldown
 * survives across the very reload we are triggering. Only one reload
 * is allowed per 10-second window per tab.
 */
const SW_RELOAD_KEY = 'sw_reload_ts';
const SW_RELOAD_COOLDOWN_MS = 10_000;

function isSafeToReloadForSwChange(): boolean {
  try {
    const raw = sessionStorage.getItem(SW_RELOAD_KEY);
    if (raw !== null) {
      const last = parseInt(raw, 10);
      if (!Number.isNaN(last) && Date.now() - last < SW_RELOAD_COOLDOWN_MS) {
        // Still within cooldown window — do NOT reload
        return false;
      }
    }
    // Record the timestamp BEFORE reloading so the cooldown is active on the
    // fresh page that loads after window.location.reload().
    sessionStorage.setItem(SW_RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    // sessionStorage unavailable (private-browsing restriction, storage quota, etc.)
    // Fall back to allowing the reload — matches the original behavior.
    return true;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update();
      }).catch((err) => {
        console.error('[PwaRegister] ServiceWorker registration failed:', err);
      });
    };

    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw);
    }

    // A newly activated worker may correspond to a deployment with a different
    // React navigation tree. Reload ONCE to prevent old cached client chunks
    // hydrating fresh server HTML.
    //
    // Guard: sessionStorage timestamp persists across the reload itself, so
    // a second controllerchange event from the newly installed SW will not
    // trigger another reload within the cooldown window.
    const onControllerChange = () => {
      if (isSafeToReloadForSwChange()) {
        console.log('[PwaRegister] New SW controller detected — reloading once to flush stale chunks.');
        window.location.reload();
      } else {
        console.log('[PwaRegister] SW controller changed but reload cooldown is active — skipping.');
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('load', registerSw);
    };
  }, []);

  return null;
}
