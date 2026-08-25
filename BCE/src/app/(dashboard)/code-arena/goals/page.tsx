import React from 'react';
import Link from 'next/link';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { ArrowLeft, Clock, Target, Calendar, CheckCircle2, Archive, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import '@/features/code-arena/components/CodeArena.css';

export default async function GoalsListPage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;

  const { data: goals, error } = await supabase
    .from('student_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="code-arena-page" style={{ padding: '24px', minHeight: '100vh', color: 'var(--text-main)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }} className="text-gradient">
            My Learning Goals
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track and manage your history of routines and targets
          </p>
        </div>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--neon-red)', borderRadius: '8px', color: '#ff8888', marginBottom: '24px' }}>
          Failed to load goals: {error.message}
        </div>
      )}

      {goals && goals.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--glass-border)' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>You don't have any learning goals set yet.</p>
          <Link href="/dashboard" style={{ marginTop: '16px', display: 'inline-block', padding: '10px 20px', background: 'var(--neon-cyan)', color: '#000', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
            Go Set Goal
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {goals?.map((goal) => {
            const formattedDate = new Date(goal.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <Card key={goal.id} variant="glass" padding="lg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', border: goal.status === 'active' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: goal.status === 'active' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: goal.status === 'active' ? 'var(--neon-cyan)' : 'var(--text-muted)',
                    border: goal.status === 'active' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
                  }}>
                    {goal.status}
                  </span>
                  
                  {goal.routine && (
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '3px 8px', borderRadius: '12px' }}>
                      Daily Routine
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {goal.goal_text}
                  </h3>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} style={{ color: 'var(--neon-cyan)' }} />
                    {goal.duration_mins} mins/day
                  </span>

                  {goal.reminder_time && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🔔 {goal.reminder_time.slice(0, 5)}
                    </span>
                  )}

                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <Calendar size={12} />
                    {formattedDate}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
