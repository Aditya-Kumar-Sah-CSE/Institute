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
    <div className="code-arena-page">
      
      {/* Hero Header */}
      <header className="code-arena-header">
        <div style={{ maxWidth: '600px' }}>
          <div className="hub-badge">
            <Swords size={14} /> BCE Coding Battle Arena
          </div>
          <h1 className="text-gradient code-arena-title">
            Compete Live in Real-Time Battles
          </h1>
          <p className="text-secondary code-arena-subtitle">
            Import problems instantly from Codeforces or LeetCode. Challenge batch mates or create custom battle codes!
          </p>
        </div>

        <div className="code-arena-nav-btns">
          <Button onClick={() => setShowWizard(true)}>
            <Plus size={16} /> Create Battle
          </Button>
          <Link href="/code-arena/problems" className="btn btn-secondaryNav action-btn">
            <Trophy size={16} /> Problem Hub
          </Link>
          <Link href="/code-arena/compiler" className="btn btn-secondaryNav action-btn">
            <Code2 size={16} /> Personal Compiler
          </Link>
          <Link href="/code-arena/profile" className="btn btn-secondaryNav action-btn">
            <Zap size={16} /> Profile
          </Link>
        </div>
      </header>

      {/* Quick Join Card */}
      <Card variant="glass" className="code-arena-join-card">
        <div className="join-card-left">
          <div className="join-card-icon-box">
            <Trophy size={20} />
          </div>
          <div className="join-card-text">
            <strong>Join Battle via Code</strong>
            <p className="text-secondary">
              Enter battle code (e.g. BCE-X7K92) to enter arena
            </p>
          </div>
        </div>

        <div className="join-card-right">
          <input
            className="join-card-input"
            placeholder="Enter Battle Code (BCE-XXXXX)"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoinBattle(); }}
          />
          <Button size="sm" onClick={handleJoinBattle} isLoading={joining}>
            Join
          </Button>
        </div>
        {joinError && <span className="join-card-error">{joinError}</span>}
      </Card>

      {/* Live & Recent Battles Section */}
      <section>
        <div className="section-header-row">
          <h2>Active & Recent Battles</h2>
          <span>{battles.length} battles found</span>
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
                <div className="battle-card-status-row">
                  <span className={`battle-status-badge ${b.status === 'LIVE' ? 'live' : 'upcoming-past'}`}>
                    ● {b.status}
                  </span>
                  <span className="battle-join-code">
                    {b.join_code}
                  </span>
                </div>

                <div>
                  <h3 className="battle-title">{b.title}</h3>
                  <div className="battle-meta-info">
                    Duration: {b.duration_minutes} mins • {b.creator_role === 'FACULTY' ? 'Faculty Battle' : 'Student Battle'}
                  </div>
                </div>

                <div className="battle-enter-btn-wrapper">
                  <Link href={`/code-arena/battles/${b.id}`} className="btn btn-secondary battle-enter-btn">
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
        <div className="section-header-row">
          <h2>Curated Practice Problems</h2>
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
