'use client';

import { ComponentType, ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Safe dynamic import wrapper that retries once on ChunkLoadError and falls back gracefully
export function safeDynamicImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  loadingFallback: ReactNode = null,
  errorFallback: ComponentType<any> = () => null
): ComponentType<any> {
  return dynamic(
    async () => {
      try {
        return await importFn();
      } catch (error: any) {
        const isChunkError = 
          error && 
          (error.name === 'ChunkLoadError' || 
           /loading/i.test(error.message) || 
           /failed/i.test(error.message) || 
           /chunk/i.test(error.message));
        
        if (isChunkError) {
          console.warn("Dynamic chunk failed to load. Retrying import once...", error);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          try {
            return await importFn();
          } catch (retryError) {
            console.error("Retry of dynamic import failed. Falling back gracefully.", retryError);
            return { default: errorFallback };
          }
        }
        
        console.error("Non-chunk error during dynamic import:", error);
        return { default: errorFallback };
      }
    },
    {
      ssr: false,
      loading: loadingFallback ? () => <>{loadingFallback}</> : undefined,
    }
  );
}

// Resilient Dynamic Imports
const BadgeCelebratorComponent = safeDynamicImport(() => import('@/components/shared/BadgeCelebrator'));
const MonthlyCelebratorComponent = safeDynamicImport(() => import('@/components/shared/MonthlyCelebrator'));

export const DynamicXpCelebrator = safeDynamicImport(() => import('@/components/shared/XpCelebrator'));
export const DynamicFeedbackWidget = safeDynamicImport(() => import('@/components/shared/FeedbackWidget'));
export const DynamicPwaRegister = safeDynamicImport(() => import('@/components/PwaRegister'));
export const DynamicPwaUpdateToast = safeDynamicImport(() => import('@/components/pwa/PwaUpdateToast'));
export const DynamicPWAInstallPrompt = safeDynamicImport(() => import('@/components/pwa/PWAInstallPrompt'));
export const DynamicCrownBanner = safeDynamicImport(() => import('@/app/(dashboard)/profile/components/CrownBanner'));

// Lazy Trigger Proxies to avoid loading BadgeCelebrator resources unless triggered
export function DynamicBadgeCelebrator() {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const res = await fetch('/api/gamification/badges');
        if (res.ok && active) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setHasUnseen(true);
          }
        }
      } catch (err) {
        console.error("Unseen badge check failed:", err);
      }
    }
    check();
    return () => {
      active = false;
    };
  }, []);

  if (!hasUnseen) return null;
  return <BadgeCelebratorComponent />;
}

// Lazy Trigger Proxies to avoid loading MonthlyCelebrator resources unless triggered
export function DynamicMonthlyCelebrator() {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const res = await fetch('/api/gamification/monthly');
        if (res.ok && active) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setHasUnseen(true);
          }
        }
      } catch (err) {
        console.error("Unseen monthly check failed:", err);
      }
    }
    check();
    return () => {
      active = false;
    };
  }, []);

  if (!hasUnseen) return null;
  return <MonthlyCelebratorComponent />;
}
