'use client';

import { useEffect, useRef } from 'react';

/**
 * PwaRegister — Service Worker Registration + Safe Update Detection
 *
 * On every Vercel deploy the SW gets a new CACHE_NAME (embed DEPLOY_ID).
 * When the new SW activates it posts `SW_ACTIVATED` to all tabs.
 * We listen for that message and reload the page ONCE so the browser
 * fetches fresh HTML/JS chunks instead of hydrating with stale ones.
 *
 * Reload guard: we track whether we already reloaded this session so
 * we never get into a reload loop ourselves.
 */
export default function PwaRegister() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const SW_RELOADED_KEY = 'sw_reloaded_for';

    // ── Message handler: SW posts SW_ACTIVATED after taking control ──────────
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_ACTIVATED') return;

      const newCacheName: string = event.data?.cacheName || '';
      const alreadyReloadedFor = sessionStorage.getItem(SW_RELOADED_KEY);

      // Only reload if we haven't already reloaded for THIS exact cache name
      // and we haven't reloaded in this JS execution context.
      if (!reloadedRef.current && alreadyReloadedFor !== newCacheName) {
        reloadedRef.current = true;
        sessionStorage.setItem(SW_RELOADED_KEY, newCacheName);
        // Small delay lets the SW finish claiming clients before we reload
        setTimeout(() => window.location.reload(), 200);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // ── Register SW ───────────────────────────────────────────────────────────
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          // Proactively check for updates every 60 s (catches long-lived tabs)
          setInterval(() => registration.update(), 60_000);

          // If a new SW is waiting RIGHT NOW (page was already loaded before),
          // send it skipWaiting and let the message handler reload.
          const waitingWorker = registration.waiting;
          if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
          }

          // Watch for future updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                // New SW is active — reload will be triggered by SW_ACTIVATED message
              }
            });
          });
        })
        .catch((err) => console.error('[SW] Registration failed:', err));
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
