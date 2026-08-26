'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Target, Play, Pause, Square, Clock, Check, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import {
  getDueRoutineTask,
  isRoutineOverdue,
  formatTime12h,
  type RoutineSlot,
  type CompletionRecord,
} from '../utils/routineSelection';

export default function PinnedGoalAlert() {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [stats, setStats] = useState<any>({ total_focus_mins: 0, per_goal_stats: [] });
  const [dueTask, setDueTask] = useState<any>(null);
  const [totalRoutinesCount, setTotalRoutinesCount] = useState(0);
  const [completedRoutinesCount, setCompletedRoutinesCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  // Store raw routines and completions for time-based re-evaluation
  const routinesRef = useRef<RoutineSlot[]>([]);
  const completionsRef = useRef<CompletionRecord[]>([]);

  const recomputeDueTask = useCallback(() => {
    const r = routinesRef.current;
    const c = completionsRef.current;
    if (r.length > 0) {
      const next = getDueRoutineTask(r, c);
      setDueTask(next || null);
    }
  }, []);

  const loadData = async () => {
    try {
      const [sessionRes, statsRes, goalsRes, routinesRes, completionsRes] = await Promise.all([
        fetch('/api/goals/sessions?active=true').then(r => r.json()),
        fetch('/api/goals/stats').then(r => r.json()),
        fetch('/api/goals?all=true').then(r => r.json()),
        fetch('/api/goals/routines').then(r => r.json()),
        fetch('/api/goals/routines/completions').then(r => r.json()),
      ]);

      if (sessionRes.sessions && sessionRes.sessions.length > 0) {
        setActiveSession(sessionRes.sessions[0]);
      } else {
        setActiveSession(null);
      }

      if (statsRes.total_focus_mins !== undefined) {
        setStats(statsRes);
      }

      if (goalsRes.goals) {
        const active = goalsRes.goals.find((g: any) => g.status === 'active');
        setActiveGoal(active || null);
      }

      if (routinesRes.routines) {
        const routineSlots: RoutineSlot[] = routinesRes.routines;
        routinesRef.current = routineSlots;
        setTotalRoutinesCount(routineSlots.length);

        const completionRecords: CompletionRecord[] = completionsRes.completions || [];
        completionsRef.current = completionRecords;

        if (completionsRes.completions) {
          setCompletedRoutinesCount(
            completionRecords.filter((c) => c.status === 'completed' || c.status === 'skipped').length
          );
        } else {
          setCompletedRoutinesCount(0);
        }

        // Use shared time-aware routine selection
        const next = getDueRoutineTask(routineSlots, completionRecords);
        setDueTask(next || null);
      }
    } catch (e) {}
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    
    // Wire custom updates
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('goal-update', handleUpdate);

    // Re-evaluate active routine every 15 seconds as time passes
    const routineInterval = setInterval(() => {
      recomputeDueTask();
    }, 15000);

    return () => {
      window.removeEventListener('goal-update', handleUpdate);
      clearInterval(routineInterval);
    };
  }, [recomputeDueTask]);

  // Timer Tick Loop
  useEffect(() => {
    if (!activeSession || activeSession.is_paused) return;

    const startMs = new Date(activeSession.started_at).getTime();
    const cumulativePause = activeSession.cumulative_pause_seconds || 0;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000) - cumulativePause;
      setElapsedSeconds(Math.max(0, elapsed));
    }, 1000);

    // Initial compute
    const initialElapsed = Math.floor((Date.now() - startMs) / 1000) - cumulativePause;
    setElapsedSeconds(Math.max(0, initialElapsed));

    return () => clearInterval(interval);
  }, [activeSession]);

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          action: 'pause'
        })
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleResume = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          action: 'resume'
        })
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          action: 'complete'
        })
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
        router.refresh();
      }
    } catch (e) {}
  };

  const handleStartGoalFocus = async (g: any) => {
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: g.id,
          duration_mins: g.duration_mins
        })
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      } else {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleStartRoutineFocus = async (task: any) => {
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: activeGoal?.id || null,
          task_id: task.id || task.time_slot,
          task_name: task.task_name,
          duration_mins: 30
        })
      });
      if (res.ok) {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      } else {
        loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  // formatTime12h is now imported from '../utils/routineSelection'

  const fmtDuration = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  // If no goals/routines exist, do not clutter dashboard
  if (!activeSession && !activeGoal && !dueTask && totalRoutinesCount === 0) {
    return null;
  }

  // Active Stopwatch state rendering takes highest priority
  if (activeSession) {
    const isPaused = activeSession.is_paused;
    const taskName = activeSession.task_name || activeSession.student_goals?.goal_text || 'Focus Session';
    const targetMins = activeSession.duration_mins || 30;
    const completedMins = Math.floor(elapsedSeconds / 60);
    
    return (
      <div 
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.1))',
          border: '1px solid rgba(6,182,212,0.4)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          animation: 'alertGlowPulse 2.5s infinite',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'grid',
            placeItems: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            animation: isPaused ? undefined : 'alertRotate 4s linear infinite',
            color: 'var(--neon-cyan)',
          }}>
            <Clock size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⏱️ Pinned Focus Session
              {activeSession.task_id && (
                <span style={{ fontSize: '10px', background: 'rgba(168,85,247,0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px' }}>
                  Routine Slot
                </span>
              )}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Working on: <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{taskName}</span>
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {completedMins} mins of {targetMins} mins completed &bull; <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--neon-purple)', fontWeight: 700 }}>{fmtDuration(elapsedSeconds)} elapsed</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isPaused ? (
            <button 
              onClick={handleResume}
              style={{
                background: 'rgba(57,255,20,0.15)',
                border: '1px solid rgba(57,255,20,0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'var(--neon-lime)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Play size={14} style={{ fill: 'currentColor' }} /> Resume
            </button>
          ) : (
            <button 
              onClick={handlePause}
              style={{
                background: 'rgba(234,179,8,0.15)',
                border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#facc15',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Pause size={14} style={{ fill: 'currentColor' }} /> Pause
            </button>
          )}

          <button 
            onClick={handleComplete}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#f87171',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <Square size={14} style={{ fill: 'currentColor' }} /> Complete
          </button>
        </div>

        <style>{`
          @keyframes alertGlowPulse {
            0%, 100% { box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37), 0 0 15px rgba(6,182,212,0.15); }
            50% { box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37), 0 0 25px rgba(6,182,212,0.25); }
          }
          @keyframes alertRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If no running session, but daily routines are completed:
  const elements: React.ReactNode[] = [];

  // Fallback to Active Goal tracker details if no routine is active
  if (activeGoal) {
    const goalFocusedMins = stats.per_goal_stats?.find((g: any) => g.goal_id === activeGoal.id)?.focused_mins || 0;
    const progressText = `${goalFocusedMins} mins of ${activeGoal.duration_mins} mins completed today`;

    elements.push(
      <div 
        key="active-goal"
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(20,20,30,0.5))',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'grid',
            placeItems: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.2)',
            color: 'var(--neon-cyan)',
          }}>
            <Target size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              🎯 Today's Focus Goal
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Active Goal: <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{activeGoal.goal_text}</span>
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {progressText}
            </p>
          </div>
        </div>

        <button 
          onClick={() => handleStartGoalFocus(activeGoal)}
          style={{
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            borderRadius: '8px',
            padding: '10px 20px',
            color: 'var(--neon-cyan)',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <Play size={12} style={{ fill: 'currentColor' }} /> Start Focus Session
        </button>
      </div>
    );
  } else {
    // No active goal — show "Add Goal" prompt
    elements.push(
      <div 
        key="add-goal"
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.1))',
          border: '1px solid rgba(6,182,212,0.3)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'grid',
            placeItems: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6,182,212,0.15)',
            border: '1px solid rgba(6,182,212,0.3)',
            color: 'var(--neon-cyan)',
          }}>
            <Target size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
              🎯 Set Your Learning Goal
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Create a goal to track your daily progress and stay focused
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-goal-modal'))}
          style={{
            background: 'var(--neon-cyan)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#000',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Create New Goal
        </button>
      </div>
    );
  }

  if (elements.length === 0) return null;

  return <>{elements}</>;
}
