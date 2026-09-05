'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LivePageContext, buildDefaultLiveContext } from '@/lib/ai/live-page-context';
import { usePathname } from 'next/navigation';

interface LivePageContextValue {
  liveContext: LivePageContext;
  setLiveContext: (ctx: Partial<LivePageContext>) => void;
  resetLiveContext: () => void;
}

const LivePageContextObj = createContext<LivePageContextValue | undefined>(undefined);

export function LivePageContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [contextState, setContextState] = useState<LivePageContext>(() => buildDefaultLiveContext(pathname));

  const setLiveContext = useCallback((newCtx: Partial<LivePageContext>) => {
    setContextState(prev => ({
      ...prev,
      ...newCtx,
      route: newCtx.route || pathname
    }));
  }, [pathname]);

  const resetLiveContext = useCallback(() => {
    setContextState(buildDefaultLiveContext(pathname));
  }, [pathname]);

  return (
    <LivePageContextObj.Provider value={{ liveContext: contextState, setLiveContext, resetLiveContext }}>
      {children}
    </LivePageContextObj.Provider>
  );
}

export function useLivePageContext(): LivePageContextValue {
  const ctx = useContext(LivePageContextObj);
  if (!ctx) {
    // Graceful fallback if component rendered outside Provider
    return {
      liveContext: buildDefaultLiveContext('/dashboard'),
      setLiveContext: () => {},
      resetLiveContext: () => {}
    };
  }
  return ctx;
}
