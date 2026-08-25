'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Target, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FocusSession {
  id: string;
  goal_id: string;
  duration_mins: number;
  status: string;
  progress_mins: number;
  started_at: string;
  student_goals?: { goal_text: string };
}

export default function FocusModeScreen({ activeSession, activeGoalText, onComplete, onExit }: { activeSession: FocusSession, activeGoalText: string, onComplete: () => void, onExit: () => void }) {
  const router = useRouter();
  const totalSeconds = activeSession.duration_mins * 60;
  
  const getInitialProgress = (): number => {
    try {
      const cached = localStorage.getItem('focus_session_progress_' + activeSession.id);
      if (cached) {
         const parsed = JSON.parse(cached);
         // calculate if it was running while refreshed
         if (parsed.status === 'running') {
            const elapsedSinceSave = Math.floor((Date.now() - parsed.lastUpdated) / 1000);
            return Math.min(parsed.progress + elapsedSinceSave, totalSeconds);
         }
         return parsed.progress;
      }
    } catch(e) {}
    return activeSession.progress_mins * 60;
  };

  const [progressSeconds, setProgressSeconds] = useState<number>(getInitialProgress());
  const [isRunning, setIsRunning] = useState(true);
  const [syncedProgress, setSyncedProgress] = useState(progressSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && progressSeconds < totalSeconds) {
       timerRef.current = setInterval(() => {
          setProgressSeconds((prev: number) => {
             const next = prev + 1;
             if (next >= totalSeconds) {
                setIsRunning(false);
                handleSessionComplete(next);
                return totalSeconds;
             }
             return next;
          });
       }, 1000);
    } else {
       if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
       if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, totalSeconds]);

  // Sync to local storage every tick, sync to DB every 60 seconds
  useEffect(() => {
    localStorage.setItem('focus_session_progress_' + activeSession.id, JSON.stringify({
      progress: progressSeconds,
      status: isRunning ? 'running' : 'paused',
      lastUpdated: Date.now()
    }));

    if (progressSeconds - syncedProgress >= 60) {
       setSyncedProgress(progressSeconds);
       syncToDb(progressSeconds, 'in_progress');
    }
  }, [progressSeconds, isRunning]);

  const syncToDb = async (seconds: number, status: string) => {
    try {
      await fetch('/api/goals/sessions', {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            session_id: activeSession.id,
            progress_mins: Math.floor(seconds / 60),
            status
         })
      });
    } catch(e) {}
  };

  const handleSessionComplete = async (finalSeconds: number) => {
    localStorage.removeItem('focus_session_progress_' + activeSession.id);
    await syncToDb(finalSeconds, 'completed');
    onComplete();
  };

  const handleAbandon = async () => {
    if (!confirm('Are you sure you want to abandon the current focus session?')) return;
    setIsRunning(false);
    localStorage.removeItem('focus_session_progress_' + activeSession.id);
    await syncToDb(progressSeconds, 'abandoned');
    onExit();
  };

  const remainingSeconds = totalSeconds - progressSeconds;
  const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const secs = (remainingSeconds % 60).toString().padStart(2, '0');
  const pct = Math.min((progressSeconds / totalSeconds) * 100, 100);

  return (
    <div style={{
       position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
       background: 'var(--bg-main)',
       zIndex: 10000,
       display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
       color: 'white', padding: '20px'
    }}>
       <div style={{ position: 'absolute', top: '30px', right: '30px' }}>
         <button onClick={handleAbandon} style={{ 
            background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--glass-border)',
            padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
         }}>Exit Focus Mode</button>
       </div>
       
       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-cyan)', fontSize: '24px', fontWeight: 'bold' }}>
             <Target size={28} />
             {activeGoalText}
          </div>

          <div style={{ fontSize: '120px', fontWeight: 900, letterSpacing: '8px', lineHeight: 1, fontFamily: 'monospace' }} className="text-gradient">
             {mins}:{secs}
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', marginTop: '20px' }}>
             <div style={{ 
                height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                transition: 'width 1s linear'
             }} />
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
             {!isRunning && remainingSeconds > 0 ? (
                <button onClick={() => setIsRunning(true)} style={{
                   width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(57, 255, 20, 0.1)',
                   border: '2px solid rgba(57, 255, 20, 0.5)', color: 'var(--neon-lime)',
                   display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                   <Play size={40} style={{ marginLeft: '6px' }} />
                </button>
             ) : remainingSeconds > 0 ? (
                <button onClick={() => setIsRunning(false)} style={{
                   width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 0, 255, 0.1)',
                   border: '2px solid rgba(255, 0, 255, 0.5)', color: 'var(--neon-magenta)',
                   display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                   <Pause size={40} />
                </button>
             ) : (
                <div style={{ color: 'var(--neon-lime)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                   <CheckCircle size={60} />
                   <h2 style={{ margin: 0 }}>Goal Completed!</h2>
                   <button onClick={() => { onComplete(); onExit(); }} style={{ 
                      background: 'var(--neon-lime)', color: '#000', border: 'none',
                      padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px'
                   }}>Return to Dashboard</button>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
