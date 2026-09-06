import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, Suspense } from 'react';
import { LivePageContext, buildDefaultLiveContext } from '@/lib/ai/live-page-context';
import { extractLiveDOMContext, invalidateDOMCache } from '@/lib/ai/live-dom-reader';
import { executeLiveDOMAction, DOMActionResult, WhitelistedActionType } from '@/lib/ai/live-dom-executor';
import { usePathname, useSearchParams } from 'next/navigation';

interface LivePageContextValue {
  liveContext: LivePageContext;
  setLiveContext: (ctx: Partial<LivePageContext>) => void;
  resetLiveContext: () => void;
  getCurrentPageContext: () => LivePageContext;
  executeDOMActionOnPage: (
    actionType: WhitelistedActionType | string,
    query: string | number,
    valueToType?: string,
    elementIndex?: number
  ) => DOMActionResult;
}

const LivePageContextObj = createContext<LivePageContextValue | undefined>(undefined);

function LivePageContextProviderInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullRoute = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

  const [contextState, setContextState] = useState<LivePageContext>(() => buildDefaultLiveContext(fullRoute));

  // 1. ROUTE CHANGE & INITIAL EXTRACTION EFFECT
  useEffect(() => {
    invalidateDOMCache();
    setContextState(buildDefaultLiveContext(fullRoute));

    const timer = setTimeout(() => {
      const freshCtx = extractLiveDOMContext(fullRoute, true);
      setContextState(freshCtx);
    }, 100);

    return () => clearTimeout(timer);
  }, [fullRoute]);

  // 2. INCREMENTAL MUTATION OBSERVER EFFECT FOR DYNAMIC CONTENT (MODALS, TOASTS, TAB SWITCHES, DATA FETCHING)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const observer = new MutationObserver((mutations) => {
      // Check if mutations occurred outside the agent drawer
      const isRelevantMutation = mutations.some((mutation) => {
        const target = mutation.target as HTMLElement | null;
        return !target?.closest('.smart-agent-drawer, .smart-mentor-drawer');
      });

      if (!isRelevantMutation) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        invalidateDOMCache();
        const updatedCtx = extractLiveDOMContext(fullRoute, true);
        setContextState(updatedCtx);
      }, 120);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-expanded', 'aria-hidden', 'aria-selected', 'role', 'data-agent-action', 'data-agent-label']
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
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
    invalidateDOMCache();
    const fresh = extractLiveDOMContext(fullRoute, true);
    setContextState(fresh);
    return fresh;
  }, [fullRoute]);

  const executeDOMActionOnPage = useCallback((
    actionType: WhitelistedActionType | string,
    query: string | number,
    valueToType?: string,
    elementIndex?: number
  ): DOMActionResult => {
    const res = executeLiveDOMAction(actionType, query, valueToType, elementIndex);
    // Refresh page context after DOM action execution
    setTimeout(() => {
      invalidateDOMCache();
      const fresh = extractLiveDOMContext(fullRoute, true);
      setContextState(fresh);
    }, 150);
    return res;
  }, [fullRoute]);

  return (
    <LivePageContextObj.Provider value={{ liveContext: contextState, setLiveContext, resetLiveContext, getCurrentPageContext, executeDOMActionOnPage }}>
      {children}
    </LivePageContextObj.Provider>
  );
}

export function LivePageContextProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LivePageContextProviderInner>{children}</LivePageContextProviderInner>
    </Suspense>
  );
}

export function useLivePageContext(): LivePageContextValue {
  const ctx = useContext(LivePageContextObj);
  if (!ctx) {
    return {
      liveContext: buildDefaultLiveContext('/dashboard'),
      setLiveContext: () => {},
      resetLiveContext: () => {},
      getCurrentPageContext: () => buildDefaultLiveContext('/dashboard'),
      executeDOMActionOnPage: (actionType, query, valueToType, elementIndex) => executeLiveDOMAction(actionType, query, valueToType, elementIndex)
    };
  }
  return ctx;
}


