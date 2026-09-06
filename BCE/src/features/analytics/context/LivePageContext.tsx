'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LivePageContext, buildDefaultLiveContext } from '@/lib/ai/live-page-context';
import { extractLiveDOMContext } from '@/lib/ai/live-dom-reader';
import { usePathname, useSearchParams } from 'next/navigation';

interface LivePageContextValue {
  liveContext: LivePageContext;
  setLiveContext: (ctx: Partial<LivePageContext>) => void;
  resetLiveContext: () => void;
  getCurrentPageContext: () => LivePageContext;
}

const LivePageContextObj = createContext<LivePageContextValue | undefined>(undefined);

export function LivePageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullRoute = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

  const [contextState, setContextState] = useState<LivePageContext>(() => buildDefaultLiveContext(fullRoute));

  // 1. ROUTE CHANGE EFFECT WITH STALE CONTEXT PROTECTION & AUTOMATIC DOM HARVESTING
  useEffect(() => {
    // A. Immediately invalidate old page context on navigation to prevent stale context
    setContextState(buildDefaultLiveContext(fullRoute));

    // B. Harvest fresh DOM context after React finishes rendering new route components
    const timer = setTimeout(() => {
      const freshCtx = extractLiveDOMContext(fullRoute);
      setContextState(freshCtx);
    }, 120);

    return () => clearTimeout(timer);
  }, [fullRoute]);

  const setLiveContext = useCallback((newCtx: Partial<LivePageContext>) => {
    setContextState(prev => ({
      ...prev,
      ...newCtx,
      route: newCtx.route || fullRoute,
      timestamp: Date.now()
    }));
  }, [fullRoute]);

  const resetLiveContext = useCallback(() => {
    setContextState(buildDefaultLiveContext(fullRoute));
  }, [fullRoute]);

  // On-demand tool invocation helper to fetch fresh live DOM context
  const getCurrentPageContext = useCallback((): LivePageContext => {
    const fresh = extractLiveDOMContext(fullRoute);
    setContextState(fresh);
    return fresh;
  }, [fullRoute]);

  return (
    <LivePageContextObj.Provider value={{ liveContext: contextState, setLiveContext, resetLiveContext, getCurrentPageContext }}>
      {children}
    </LivePageContextObj.Provider>
  );
}

export function useLivePageContext(): LivePageContextValue {
  const ctx = useContext(LivePageContextObj);
  if (!ctx) {
    // Fallback if rendered outside Provider
    return {
      liveContext: buildDefaultLiveContext('/dashboard'),
      setLiveContext: () => {},
      resetLiveContext: () => {},
      getCurrentPageContext: () => buildDefaultLiveContext('/dashboard')
    };
  }
  return ctx;
}
