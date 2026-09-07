'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Target, Calendar, Edit3, Save, Plus, Trash2, Bell, BellRing, Play, Pause, RotateCcw, Volume2, VolumeX, SkipForward, Check, Square, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { usePremiumAlert } from '../hooks/usePremiumAlert';
import {
  getActiveRoutineIndex,
  formatTime12h,
  formatMinsToHm,
} from '../utils/routineSelection';

const DEFAULT_ROUTINE = [
  { time_slot: '04:00', task_name: 'Running / Exercise', sort_order: 0 },
  { time_slot: '06:00', task_name: 'Revision', sort_order: 1 },
  { time_slot: '08:00', task_name: 'Breakfast', sort_order: 2 },
  { time_slot: '10:00', task_name: 'Study Session 1', sort_order: 3 },
  { time_slot: '14:00', task_name: 'Lunch Break', sort_order: 4 },
  { time_slot: '16:00', task_name: 'Study Session 2', sort_order: 5 },
  { time_slot: '17:00', task_name: 'Play / Code', sort_order: 6 },
  { time_slot: '20:00', task_name: 'Dinner', sort_order: 7 },
  { time_slot: '22:00', task_name: 'Sleep', sort_order: 8 },
];



export default function GoalsClient() {
  const { alert: premiumAlert, confirm: premiumConfirm, AlertComponent } = usePremiumAlert();
  const [goals, setGoals] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stopwatch / Study Timer states
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [todayStats, setTodayStats] = useState<any>({ total_focus_mins: 0, per_goal_stats: [] });
  const [completions, setCompletions] = useState<any[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Edit goal modal
  const [editGoal, setEditGoal] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [editDuration, setEditDuration] = useState('30');
  const [editRoutine, setEditRoutine] = useState(false);
  const [editReminder, setEditReminder] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Routine editing
  const [editingRoutine, setEditingRoutine] = useState(false);
  const [draftRoutines, setDraftRoutines] = useState<any[]>([]);
  const [savingRoutine, setSavingRoutine] = useState(false);

  // Timer / Alarm state
  const [alarmTarget, setAlarmTarget] = useState<any>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [alarmFired, setAlarmFired] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Current time for live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Fetch active session and timing details from DB
  const fetchActiveSession = async () => {
    try {
      const res = await fetch('/api/goals/sessions?active=true');
      const data = await res.json();
      if (data.sessions && data.sessions.length > 0) {
        const sess = data.sessions[0];
        const isDismissed = typeof window !== 'undefined' && sessionStorage.getItem('dismissed_focus_session_' + sess.id);
        const totalSecs = (sess.duration_mins || 30) * 60;
        const startedMs = sess.started_at ? new Date(sess.started_at).getTime() : Date.now();
        let cumPauseSecs = Number(sess.cumulative_pause_seconds || 0);

        if (sess.is_paused && sess.last_paused_at) {
          const lastPausedMs = new Date(sess.last_paused_at).getTime();
          cumPauseSecs += Math.max(0, Math.floor((Date.now() - lastPausedMs) / 1000));
        }

        const elapsedSecs = sess.is_paused
          ? cumPauseSecs
          : Math.max(0, Math.floor((Date.now() - startedMs) / 1000) - cumPauseSecs);

        const remaining = Math.max(0, totalSecs - elapsedSecs);

        if (!isDismissed && remaining > 0) {
          setActiveSession(sess);
          if (sess.goal_id) setSelectedGoalId(sess.goal_id);
          if (sess.task_id) setSelectedTaskId(sess.task_id);
        } else {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    } catch (e) {}
  };

  const fetchStatsAndCompletions = async () => {
    try {
      const [statsRes, completionsRes] = await Promise.all([
        fetch('/api/goals/stats'),
        fetch('/api/goals/routines/completions')
      ]);
      const statsData = await statsRes.json();
      const completionsData = await completionsRes.json();
      if (statsData.total_focus_mins !== undefined) setTodayStats(statsData);
      if (completionsData.completions) setCompletions(completionsData.completions);
    } catch (e) {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalsRes, routinesRes] = await Promise.all([
        fetch('/api/goals?all=true'),
        fetch('/api/goals/routines'),
      ]);
      const goalsData = await goalsRes.json();
      const routinesData = await routinesRes.json();

      if (goalsData.goals) {
        setGoals(goalsData.goals);
        if (goalsData.goals.length > 0 && !selectedGoalId) {
          setSelectedGoalId(goalsData.goals[0].id);
        }
      }
      if (routinesData.routines) {
        setRoutines(routinesData.routines);
      }
      if (goalsData.error) setError(goalsData.error);

      await Promise.all([
        fetchActiveSession(),
        fetchStatsAndCompletions()
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Stopwatch ticking client interval using exact timestamp calculation to avoid background throttle drift
  useEffect(() => {
    if (activeSession) {
      const startedTime = new Date(activeSession.started_at).getTime();
      const cumPause = Number(activeSession.cumulative_pause_seconds || 0);

      const updateTicker = () => {
        if (activeSession.is_paused) {
          setElapsedSeconds(cumPause);
        } else {
          const delta = Math.floor((Date.now() - startedTime) / 1000);
          setElapsedSeconds(Math.max(0, delta - cumPause));
        }
      };

      updateTicker();
      stopwatchIntervalRef.current = setInterval(updateTicker, 1000);
    } else {
      setElapsedSeconds(0);
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    }

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
    };
  }, [activeSession]);

  const handleStartStopwatch = async () => {
    try {
      const matchingRoutineTask = routines.find(r => r.id === selectedTaskId);
      const res = await fetch('/api/goals/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: selectedGoalId || null,
          task_id: selectedTaskId || null,
          task_name: matchingRoutineTask ? matchingRoutineTask.task_name : null,
          duration_mins: 30
        })
      });
      const data = await res.json();
      if (data.error) {
        premiumAlert(data.error, 'Stopwatch error', 'error');
        await loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
        return;
      }
      if (data.session) {
        setActiveSession(data.session);
        // Dispatch local event for dashboard sync
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {
      premiumAlert('Failed to start stopwatch.', 'Error', 'error');
    }
  };

  const handlePauseStopwatch = async () => {
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
      const data = await res.json();
      if (data.session) {
        setActiveSession(data.session);
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleResumeStopwatch = async () => {
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
      const data = await res.json();
      if (data.session) {
        setActiveSession(data.session);
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleCompleteStopwatch = async () => {
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
      const data = await res.json();
      if (data.session) {
        setActiveSession(null);
        await Promise.all([
          loadData(),
          fetchStatsAndCompletions()
        ]);
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleAbandonStopwatch = async () => {
    if (!activeSession) return;
    if (!confirm('Are you sure you want to abandon this stopwatch focus session?')) return;
    try {
      const res = await fetch('/api/goals/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.id,
          action: 'abandon'
        })
      });
      const data = await res.json();
      if (data.session) {
        setActiveSession(null);
        await Promise.all([
          loadData(),
          fetchStatsAndCompletions()
        ]);
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleToggleRoutineCompletion = async (slot: any, isCurrentlyDone: boolean) => {
    try {
      const res = await fetch('/api/goals/routines/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: slot.id || slot.time_slot,
          task_name: slot.task_name,
          action: isCurrentlyDone ? 'delete' : 'create',
          status: 'completed'
        })
      });
      if (res.ok) {
        await fetchStatsAndCompletions();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };

  const handleSkipRoutineTask = async (slot: any) => {
    try {
      const res = await fetch('/api/goals/routines/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: slot.id || slot.time_slot,
          task_name: slot.task_name,
          action: 'create',
          status: 'skipped'
        })
      });
      if (res.ok) {
        await fetchStatsAndCompletions();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {}
  };


  // --- Goal Edit ---
  const openEditModal = (goal: any) => {
    setEditGoal(goal);
    setEditText(goal.goal_text);
    setEditDuration((goal.duration_mins || 30).toString());
    setEditRoutine(goal.routine || false);
    setEditReminder(goal.reminder_time ? goal.reminder_time.slice(0, 5) : '');
  };

  const handleSaveEdit = async () => {
    if (!editGoal) return;
    setEditSaving(true);
    try {
      const isNew = !editGoal.id;
      const res = await fetch('/api/goals', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isNew ? {} : { goal_id: editGoal.id }),
          goal_text: editText,
          duration_mins: parseInt(editDuration) || 30,
          routine: editRoutine,
          reminder_time: editReminder || null,
        }),
      });
      if (res.ok) {
        setEditGoal(null);
        await loadData();
        window.dispatchEvent(new CustomEvent('goal-update'));
      }
    } catch (e) {
      premiumAlert('Failed to save goal.', 'Save Error', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!(await premiumConfirm('Are you sure you want to delete this goal?', 'Confirm Deletion', 'Delete', 'Cancel', 'confirm'))) return;
    setDeletingId(goalId);
    try {
      const res = await fetch(`/api/goals?goal_id=${goalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadData();
      } else {
        premiumAlert('Failed to delete goal.', 'Error', 'error');
      }
    } catch (e) {
      premiumAlert('Error deleting goal.', 'Error', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Routine ---
  const handleStartEditRoutine = () => {
    setEditingRoutine(true);
    setDraftRoutines(routines.length > 0 ? routines.map(r => ({ ...r })) : DEFAULT_ROUTINE.map(r => ({ ...r })));
  };

  const handleLoadDefaults = () => {
    setDraftRoutines(DEFAULT_ROUTINE.map(r => ({ ...r })));
  };

  const handleAddSlot = () => {
    setDraftRoutines(prev => [...prev, { time_slot: '12:00', task_name: '', sort_order: prev.length }]);
  };

  const handleRemoveSlot = (idx: number) => {
    setDraftRoutines(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sort_order: i })));
  };

  const handleSaveRoutine = async () => {
    setSavingRoutine(true);
    try {
      const cleaned = draftRoutines
        .filter(r => r.task_name.trim())
        .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
        .map((r, i) => ({ time_slot: r.time_slot, task_name: r.task_name, sort_order: i }));

      const res = await fetch('/api/goals/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routines: cleaned }),
      });
      const data = await res.json();
      if (data.routines) setRoutines(data.routines);
      setEditingRoutine(false);
    } catch (e) {
      premiumAlert('Failed to save routine.', 'Save Error', 'error');
    } finally {
      setSavingRoutine(false);
    }
  };

  // --- Timer / Alarm ---
  const startAlarmFor = (routine: any) => {
    const [h, m] = routine.time_slot.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // Next occurrence

    const diffSecs = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
    setAlarmTarget(routine);
    setTimerRemaining(diffSecs);
    setTimerRunning(true);
    setAlarmFired(false);
    setAlarmMuted(false);
  };

  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            setAlarmFired(true);
            // Play alarm sound
            try {
              if (!alarmMuted) {
                const audio = new Audio('/alarm.mp3');
                audio.loop = true;
                audio.play().catch(() => {});
                audioRef.current = audio;
              }
            } catch (e) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, alarmMuted]);

  const stopAlarm = () => {
    setAlarmFired(false);
    setTimerRunning(false);
    setAlarmTarget(null);
    setTimerRemaining(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const toggleMute = () => {
    setAlarmMuted(!alarmMuted);
    if (audioRef.current) {
      audioRef.current.muted = !alarmMuted;
    }
  };

  const fmtCountdown = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHHMMSS = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeSlotIdx = getActiveRoutineIndex(routines);
  const nowStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="code-arena-page goals-page-scroll" style={{ padding: '24px', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
          <Link href="/dashboard" style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0 }} title="Back to Dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }} className="text-gradient">My Daily Routine</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Manage your daily routine checklist and set alarms</p>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--neon-red)', borderRadius: '8px', color: '#ff8888', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* ── ACTIVE ALARM/TIMER BANNER ── */}
      {(alarmTarget || alarmFired) && (
        <div style={{
          marginBottom: '24px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: alarmFired
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(234,179,8,0.1))'
            : 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(168,85,247,0.08))',
          border: alarmFired ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(6,182,212,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: alarmFired ? 'pulse 1s infinite' : undefined,
        }}>
          {alarmFired ? <BellRing size={28} style={{ color: '#ef4444' }} /> : <Bell size={24} style={{ color: 'var(--neon-cyan)' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>
              {alarmFired ? '⏰ ALARM! Time for:' : '⏳ Timer active for:'}
              <span style={{ color: 'var(--neon-cyan)', marginLeft: '6px' }}>{alarmTarget?.task_name}</span>
            </div>
            {!alarmFired && (
              <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', marginTop: '4px', color: 'var(--neon-purple)' }}>
                {fmtCountdown(timerRemaining)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {alarmMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={stopAlarm} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
              Stop
            </button>
          </div>
        </div>
      )}

      {/* ── DAILY ROUTINE (FULL WIDTH) ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Card variant="glass" padding="lg" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--neon-cyan)' }} />
              Daily Routine
            </h2>
            {!editingRoutine ? (
              <button onClick={handleStartEditRoutine} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                <Edit3 size={12} /> Edit Routine
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleLoadDefaults} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                  Load Defaults
                </button>
                <button onClick={() => setEditingRoutine(false)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                  Cancel
                </button>
                <button onClick={handleSaveRoutine} disabled={savingRoutine} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'var(--neon-cyan)', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 700, opacity: savingRoutine ? 0.5 : 1 }}>
                  <Save size={12} /> {savingRoutine ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* EDITING MODE */}
          {editingRoutine ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Column Labels */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 32px', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 4px' }}>
                <span>Time</span><span>Task</span><span></span>
              </div>
              {draftRoutines.map((slot, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 32px', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={slot.time_slot}
                    onChange={e => {
                      const updated = [...draftRoutines];
                      updated[i] = { ...updated[i], time_slot: e.target.value };
                      setDraftRoutines(updated);
                    }}
                    style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                  <input
                    type="text"
                    value={slot.task_name}
                    onChange={e => {
                      const updated = [...draftRoutines];
                      updated[i] = { ...updated[i], task_name: e.target.value };
                      setDraftRoutines(updated);
                    }}
                    placeholder="Task name..."
                    style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                  />
                  <button onClick={() => handleRemoveSlot(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'grid', placeItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={handleAddSlot} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                <Plus size={14} /> Add Time Slot
              </button>
            </div>
          ) : (
            /* VIEW MODE */
            routines.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>No routine set yet</p>
                <button onClick={handleStartEditRoutine} style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '6px', background: 'var(--neon-cyan)', border: 'none', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                  Create Routine
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {routines.map((slot, i) => {
                  const isActive = i === activeSlotIdx;
                  const isPast = i < activeSlotIdx;
                  const slotId = slot.id || slot.time_slot;
                  
                  const compTask = completions.find(c => c.task_id === slotId);
                  const isCompleted = compTask?.status === 'completed';
                  const isSkipped = compTask?.status === 'skipped';
                  const isDone = isCompleted || isSkipped;

                  return (
                    <div
                      key={slot.id || i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 90px 1fr auto',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(6,182,212,0.08)' : 'transparent',
                        borderLeft: isActive ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                        opacity: isDone ? 0.4 : isPast ? 0.7 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <button
                        onClick={() => handleToggleRoutineCompletion(slot, isCompleted)}
                        title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          color: isCompleted ? 'var(--neon-lime)' : 'var(--text-muted)'
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />}
                      </button>

                      <div style={{ fontSize: '13px', fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--text-main)' : 'var(--text-secondary)' }}>
                        {formatTime12h(slot.time_slot)}
                      </div>

                      <div style={{ fontSize: '13px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-main)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                        {slot.task_name}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!isDone && (
                          <>
                            <button
                              onClick={() => handleSkipRoutineTask(slot)}
                              title="Skip Task"
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <SkipForward size={13} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                            <button
                              onClick={() => startAlarmFor(slot)}
                              title={`Set alarm for ${slot.task_name}`}
                              style={{
                                background: alarmTarget?.time_slot === slot.time_slot ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.03)',
                                border: alarmTarget?.time_slot === slot.time_slot ? '1px solid rgba(234,179,8,0.3)' : '1px solid var(--glass-border)',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                color: alarmTarget?.time_slot === slot.time_slot ? '#eab308' : 'var(--text-muted)',
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              <Bell size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </Card>
      </div>

      <AlertComponent />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
