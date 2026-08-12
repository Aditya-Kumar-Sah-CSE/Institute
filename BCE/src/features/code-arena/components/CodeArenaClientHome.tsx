'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Swords, Plus, Play, Code2, Trophy, Copy, ArrowRight, Zap } from 'lucide-react';
import CreateBattleWizard from './CreateBattleWizard';
import './CodeArena.css';

export default function CodeArenaClientHome({
  user,
  isInstructor,
  initialBattles,
  initialProblems,
  batches = [],
}: {
  user: any;
  isInstructor: boolean;
  initialBattles: any[];
  initialProblems: any[];
  batches?: any[];
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [battles, setBattles] = useState<any[]>(initialBattles);

  const handleJoinBattle = async () => {
    if (!joinCodeInput.trim()) return;
    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch('/api/coding/battles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCodeInput.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Battle not found or code invalid.');
      }

      window.location.href = `/code-arena/battles/${json.data.id}`;
    } catch (err: any) {
      setJoinError(err.message || 'Battle not found.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      
      {/* Hero Header */}
      <header className="code-arena-header" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', marginBottom: '8px' }}>
            <Swords size={14} /> BCE Coding Battle Arena
          </div>
          <h1 className="text-gradient" style={{ fontSize: 'var(--text-2xl)', margin: 0, fontWeight: 800 }}>
            Compete Live in Real-Time Battles
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '8px' }}>
            Import problems instantly from Codeforces or LeetCode. Challenge batch mates or create custom battle codes!
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={() => setShowWizard(true)}>
            <Plus size={16} /> Create Battle
          </Button>
          <Link href="/code-arena/problems" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={16} /> Problem Hub
          </Link>
          <Link href="/code-arena/compiler" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Code2 size={16} /> Personal Compiler
          </Link>
          <Link href="/code-arena/profile" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={16} /> Profile
          </Link>
        </div>
      </header>

      {/* Quick Join Card */}
      <Card variant="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md) var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', display: 'grid', placeItems: 'center' }}>
            <Trophy size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 'var(--text-sm)' }}>Join Battle via Code</strong>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
              Enter battle code (e.g. BCE-X7K92) to enter arena
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1', maxWidth: '380px' }}>
          <input
            style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'monospace' }}
            placeholder="Enter Battle Code (BCE-XXXXX)"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoinBattle(); }}
          />
          <Button size="sm" onClick={handleJoinBattle} isLoading={joining}>
            Join
          </Button>
        </div>
        {joinError && <span style={{ color: '#f87171', fontSize: '11px', width: '100%' }}>{joinError}</span>}
      </Card>

      {/* Live & Recent Battles Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>Active & Recent Battles</h2>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{battles.length} battles found</span>
        </div>

        {battles.length === 0 ? (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <Swords size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)' }}>No active battles right now</h3>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-md)' }}>
              Be the first to start a coding battle for your friends!
            </p>
            <Button size="sm" onClick={() => setShowWizard(true)}>
              + Create First Battle
            </Button>
          </Card>
        ) : (
          <div className="problem-grid">
            {battles.map((b) => (
              <Card key={b.id} variant="glass" className="problem-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: b.status === 'LIVE' ? '#4ade80' : 'var(--neon-cyan)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px' }}>
                    ● {b.status}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--neon-gold)' }}>
                    {b.join_code}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '4px 0' }}>{b.title}</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Duration: {b.duration_minutes} mins • {b.creator_role === 'FACULTY' ? 'Faculty Battle' : 'Student Battle'}
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-xs)' }}>
                  <Link href={`/code-arena/battles/${b.id}`} className="btn btn-secondary" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: 'var(--text-xs)' }}>
                    Enter Battle <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Practice Problems Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>Curated Practice Problems</h2>
        </div>

        <div className="problem-grid">
          {initialProblems.map((problem) => (
            <Link key={problem.id} href={`/code-arena/problems/${problem.id}`} style={{ textDecoration: 'none' }}>
              <Card variant="glass" className="problem-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`difficulty-${problem.difficulty}`} style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                    {problem.difficulty}
                  </span>
                  <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    {problem.source_type}
                  </span>
                </div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: '6px 0 0 0', color: 'var(--text-main)' }}>
                  {problem.title}
                </h3>
                <div className="problem-meta">
                  {problem.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Create Battle Wizard Modal */}
      {showWizard && (
        <CreateBattleWizard
          isInstructor={isInstructor}
          batches={batches}
          onClose={() => setShowWizard(false)}
          onSuccess={(newBattle) => {
            setBattles([newBattle, ...battles]);
          }}
        />
      )}
    </div>
  );
}
