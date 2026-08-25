'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Target, Play, Plus, X } from 'lucide-react';
import FocusModeScreen from './FocusModeScreen';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

export default function AddGoalDashboardCard({ initialGoal }: { initialGoal: any }) {
  const router = useRouter();
  const [goal, setGoal] = useState<any>(initialGoal);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Form State
  const [goalText, setGoalText] = useState('');
  const [durationMins, setDurationMins] = useState(30);
  const [routine, setRoutine] = useState(false);
  const [reminder, setReminder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoStartFocus, setAutoStartFocus] = useState(false);

  useEffect(() => {
    // Check if there's a cached running session on mount
    fetch('/api/goals/sessions?active=true')
      .then(r => r.json())
      .then(data => {
         if (data.sessions && data.sessions.length > 0) {
            setActiveSession(data.sessions[0]);
         }
      })
      .catch(() => {});
  }, []);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_text: goalText,
          duration_mins: durationMins,
          routine,
          reminder_time: reminder || null
        })
      });
      const data = await res.json();
      if (res.ok) {
         setGoal(data.goal);
         setIsModalOpen(false);
         if (autoStartFocus) {
            handleStartFocus(data.goal);
         } else {
            router.refresh();
         }
      }
    } catch(e) {
      alert('Failed to save error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartFocus = async (targetGoal: any) => {
    try {
      const res = await fetch('/api/goals/sessions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ goal_id: targetGoal.id, duration_mins: targetGoal.duration_mins })
      });
      const data = await res.json();
      if (res.ok) {
         setActiveSession({ ...data.session, student_goals: { goal_text: targetGoal.goal_text }});
      }
    } catch(e) {}
  };

  return (
    <>
      <div onClick={() => setIsModalOpen(true)} style={{ textDecoration: 'none', cursor: 'pointer' }} title={goal ? "Update Goal" : "Create Goal"}>
        <Card variant="glass" padding="lg" className="stat-card hover-lift">
          <div className="stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Target size={24} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: '#ef4444', fontSize: goal ? '1rem' : '1.2rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
              {goal ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.goal_text}</span>
                   <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.8 }}>{goal.duration_mins} min {goal.routine ? 'routine' : 'goal'}</span>
                </div>
              ) : (
                <>
                  <Plus size={16} /> New Goal
                </>
              )}
            </div>
            <div className="text-secondary stat-card-label">{goal ? "Active Goal" : "Target Tracker"}</div>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Learning Goal" size="md">
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
               <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Goal (E.g. Complete DSA Sheet)</label>
               <input 
                 autoFocus
                 type="text" 
                 value={goalText} onChange={e => setGoalText(e.target.value)} 
                 placeholder="What do you want to achieve?"
                 style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
               />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Duration (mins/day)</label>
                  <input
                     type="number"
                     min={5}
                     max={480}
                     value={durationMins}
                     onChange={e => setDurationMins(Math.max(5, parseInt(e.target.value) || 5))}
                     style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                     {[15, 25, 30, 45, 60, 90, 120].map(v => (
                        <button
                           key={v}
                           type="button"
                           onClick={() => setDurationMins(v)}
                           style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              border: durationMins === v ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                              background: durationMins === v ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                              color: durationMins === v ? 'var(--neon-cyan)' : 'var(--text-muted)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                           }}
                        >
                           {v >= 60 ? `${v/60}h` : `${v}m`}
                        </button>
                     ))}
                  </div>
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Reminder Time (Optional)</label>
                  <input 
                    type="time" 
                    value={reminder} onChange={e => setReminder(e.target.value)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                  />
               </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={routine} onChange={e => setRoutine(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                  Set as Daily Routine
               </label>
               
               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={autoStartFocus} onChange={e => setAutoStartFocus(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                  Start Focus Mode Now
               </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
               <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
               <button onClick={handleSaveGoal} disabled={!goalText || isSaving} style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--neon-cyan)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: (!goalText || isSaving) ? 0.5 : 1 }}>
                  {isSaving ? 'Saving...' : 'Set Goal'}
               </button>
            </div>
            
            {goal && (
               <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Goal</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{goal.goal_text}</div>
                  </div>
                  <button onClick={() => handleStartFocus(goal)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                     <Play size={14} /> Start Focus Session
                  </button>
               </div>
            )}
         </div>
      </Modal>

      {activeSession && (
         <FocusModeScreen 
            activeSession={activeSession}
            activeGoalText={activeSession.student_goals?.goal_text || goalText || 'Focus Session'}
            onComplete={() => setActiveSession(null)}
            onExit={() => { setActiveSession(null); router.refresh(); }}
         />
      )}
    </>
  );
}
