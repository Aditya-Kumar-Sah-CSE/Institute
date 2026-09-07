'use client';

import { useState, useEffect, useRef } from 'react';
import { focusModeStorage, FocusModeState } from '../utils/focusModeStorage';

export function useFocusMode(
  activeSession: any,
  onComplete: () => void,
  onExit: () => void
) {
  const computeInitialState = (): FocusModeState => {
    const cached = focusModeStorage.get();
    if (activeSession) {
      const totalSecs = (activeSession.duration_mins || 30) * 60;
      const startedMs = activeSession.started_at ? new Date(activeSession.started_at).getTime() : Date.now();
      let cumPauseSecs = Number(activeSession.cumulative_pause_seconds || 0);

      if (activeSession.is_paused && activeSession.last_paused_at) {
        const lastPausedMs = new Date(activeSession.last_paused_at).getTime();
        cumPauseSecs += Math.max(0, Math.floor((Date.now() - lastPausedMs) / 1000));
      }

      const elapsedSecs = activeSession.is_paused
        ? cumPauseSecs
        : Math.max(0, Math.floor((Date.now() - startedMs) / 1000) - cumPauseSecs);

      const remaining = Math.max(0, totalSecs - elapsedSecs);

      return {
        isRunning: !activeSession.is_paused && remaining > 0,
        remaining,
        size: cached.size || { width: 380, height: 260 },
        position: cached.position || { x: 20, y: 80 },
        session: {
          id: activeSession.id,
          name: activeSession.task_name || activeSession.student_goals?.goal_text || 'Focus Session',
          total: totalSecs,
        },
      };
    }
    return cached;
  };

  const [state, setState] = useState<FocusModeState>(computeInitialState);

  // Recalculate if activeSession changes (e.g. async load after reload)
  useEffect(() => {
    if (activeSession) {
      setState(computeInitialState());
    }
  }, [activeSession?.id, activeSession?.started_at, activeSession?.is_paused]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryRef = useRef<number | null>(null);
  const syncedProgressRef = useRef<number>(0);

  // Sync state changes to localStorage
  useEffect(() => {
    focusModeStorage.set(state);
  }, [state]);

  // Sync to database
  const syncToDb = async (remaining: number, status: string) => {
    if (!state.session) return;
    try {
      const elapsed = state.session.total - remaining;
      const progressMins = Math.floor(elapsed / 60);
      await fetch('/api/goals/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.session.id,
          progress_mins: progressMins,
          status,
        }),
      });
      syncedProgressRef.current = elapsed;
    } catch (e) {
      console.error('Failed to sync timer to DB:', e);
    }
  };

  // Timer run loop using timestamp delta to prevent background throttle lag
  useEffect(() => {
    if (state.isRunning && state.remaining > 0 && state.session) {
      // Calculate the target end time
      expiryRef.current = Date.now() + state.remaining * 1000;

      timerRef.current = setInterval(() => {
        if (!expiryRef.current || !state.session) return;
        const currentRemaining = Math.max(0, Math.ceil((expiryRef.current - Date.now()) / 1000));
        
        setState(prev => {
          if (currentRemaining <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Handle session completion
            handleComplete();
            return {
              ...prev,
              isRunning: false,
              remaining: 0,
            };
          }

          // Periodic database sync every 60s
          const elapsed = prev.session ? (prev.session.total - currentRemaining) : 0;
          if (elapsed - syncedProgressRef.current >= 60) {
            syncToDb(currentRemaining, 'in_progress');
          }

          // Fast recovery localStorage updates inside local state sync
          return {
            ...prev,
            remaining: currentRemaining,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      expiryRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isRunning, state.session]);

  const handleComplete = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (state.session) {
      // Clean local storage cache
      localStorage.removeItem('focus_session_progress_' + state.session.id);
      await syncToDb(0, 'completed');
    }
    focusModeStorage.clear();
    onComplete();
  };

  const togglePlay = () => {
    setState(prev => {
      const nextRunning = !prev.isRunning;
      if (!nextRunning && prev.session) {
        // Sync pause to DB
        syncToDb(prev.remaining, 'in_progress');
        // Standard caching compatibility
        localStorage.setItem('focus_session_progress_' + prev.session.id, JSON.stringify({
          progress: prev.session.total - prev.remaining,
          status: 'paused',
          lastUpdated: Date.now()
        }));
      }
      return {
        ...prev,
        isRunning: nextRunning,
      };
    });
  };

  const reset = () => {
    setState(prev => {
      if (!prev.session) return prev;
      const initialRemaining = prev.session.total;
      localStorage.setItem('focus_session_progress_' + prev.session.id, JSON.stringify({
        progress: 0,
        status: prev.isRunning ? 'running' : 'paused',
        lastUpdated: Date.now()
      }));
      syncToDb(initialRemaining, 'in_progress');
      return {
        ...prev,
        remaining: initialRemaining,
      };
    });
  };

  const exit = async (confirmClose = true) => {
    if (confirmClose) {
      if (!confirm('Are you sure you want to abandon the current focus session?')) return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (state.session) {
      localStorage.removeItem('focus_session_progress_' + state.session.id);
      await syncToDb(state.remaining, 'abandoned');
    }
    focusModeStorage.clear();
    onExit();
  };

  const setSize = (width: number, height: number) => {
    setState(prev => ({
      ...prev,
      size: { width, height },
    }));
  };

  const setPosition = (x: number, y: number) => {
    setState(prev => ({
      ...prev,
      position: { x, y },
    }));
  };

  return {
    state,
    togglePlay,
    reset,
    exit,
    setSize,
    setPosition,
  };
}
