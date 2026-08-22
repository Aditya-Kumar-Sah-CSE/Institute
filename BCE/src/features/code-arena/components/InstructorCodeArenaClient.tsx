'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Swords,
  Plus,
  Play,
  Copy,
  ArrowRight,
  Code2,
  FilePlus,
  BarChart2,
  CheckCircle2,
  Clock,
  Users,
  Edit,
  Trash2,
  Square,
} from 'lucide-react';
import CreateBattleWizard from './CreateBattleWizard';
import ProblemForm from './ProblemForm';
import { deleteCodingProblem, duplicateCodingProblem } from '../actions';
import './CodeArena.css';

export default function InstructorCodeArenaClient({
  user,
  initialBattles,
  initialProblems,
  batches = [],
}: {
  user: any;
  initialBattles: any[];
  initialProblems: any[];
  batches?: any[];
}) {
  const [activeTab, setActiveTab] = useState<'BATTLES' | 'PROBLEMS'>('BATTLES');
  const [battleFilter, setBattleFilter] = useState<'ALL' | 'ACTIVE' | 'LOBBY' | 'COMPLETED' | 'MY_BATTLES'>('ALL');

  const [battles, setBattles] = useState<any[]>(initialBattles);
  const [problems, setProblems] = useState<any[]>(initialProblems);

  // Modals
  const [showBattleWizard, setShowBattleWizard] = useState(false);
  const [editingBattle, setEditingBattle] = useState<any | null>(null);
  const [showCreateProblemModal, setShowCreateProblemModal] = useState(false);

  const [startingId, setStartingId] = useState<string | null>(null);

  // Filtered Battles
  const filteredBattles = battles.filter((b) => {
    if (battleFilter === 'ACTIVE') return b.status === 'LIVE';
    if (battleFilter === 'LOBBY') return b.status === 'LOBBY' || b.status === 'SCHEDULED' || b.status === 'DRAFT';
    if (battleFilter === 'COMPLETED') return b.status === 'COMPLETED';
    if (battleFilter === 'MY_BATTLES') return b.created_by === user?.id;
    return true;
  });

  // Host Start Battle Action
  const handleStartBattle = async (battleId: string) => {
    setStartingId(battleId);
    try {
      const res = await fetch(`/api/coding/battles/${battleId}/start`, {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.error?.message || 'Could not start battle.');
        return;
      }

      // Update state locally
      setBattles((prev) =>
        prev.map((b) => (b.id === battleId ? { ...b, status: 'LIVE', start_time: json.battle.start_time, end_time: json.battle.end_time } : b))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to start battle.');
    } finally {
      setStartingId(null);
    }
  };

  // Host End Battle Action
  const handleEndBattle = async (battleId: string) => {
    if (!confirm('Are you sure you want to end this battle now?')) return;
    try {
      const res = await fetch(`/api/coding/battles/${battleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error?.message || 'Could not end battle.');
        return;
      }
      setBattles((prev) => prev.map((b) => (b.id === battleId ? { ...b, status: 'COMPLETED' } : b)));
    } catch (err: any) {
      alert(err.message || 'Failed to end battle.');
    }
  };

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header Bar */}
      <header
        className="code-arena-header"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          padding: 'var(--space-lg) var(--space-xl)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--neon-cyan)',
              background: 'rgba(6,182,212,0.1)',
              padding: '4px 10px',
              borderRadius: '12px',
              marginBottom: '6px',
            }}
          >
            <Swords size={14} /> Instructor Code Arena Studio
          </div>
          <h1 className="text-gradient" style={{ fontSize: 'var(--text-2xl)', margin: 0, fontWeight: 800 }}>
            Manage Battles & Problems
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: '4px', margin: 0 }}>
            Create battles with custom or imported problems, monitor real-time participants, and view analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            onClick={() => {
              setEditingBattle(null);
              setShowBattleWizard(true);
            }}
          >
            <Plus size={16} /> New Battle
          </Button>
          <Button variant="secondary" onClick={() => setShowCreateProblemModal(true)}>
            <FilePlus size={16} /> Create Internal Problem
          </Button>
        </div>
      </header>

      {/* Primary Dashboard Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', gap: 'var(--space-md)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('BATTLES')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'BATTLES' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'BATTLES' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Swords size={16} /> Battles ({battles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PROBLEMS')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PROBLEMS' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'PROBLEMS' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Code2 size={16} /> Internal Problems ({problems.length})
        </button>
      </div>

      {/* TAB 1: MANAGE BATTLES */}
      {activeTab === 'BATTLES' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Battle Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button size="sm" variant={battleFilter === 'ALL' ? 'primary' : 'secondary'} onClick={() => setBattleFilter('ALL')}>
              All Battles
            </Button>
            <Button size="sm" variant={battleFilter === 'LOBBY' ? 'primary' : 'secondary'} onClick={() => setBattleFilter('LOBBY')}>
              Upcoming / Lobby
            </Button>
            <Button size="sm" variant={battleFilter === 'ACTIVE' ? 'primary' : 'secondary'} onClick={() => setBattleFilter('ACTIVE')}>
              Live
            </Button>
            <Button size="sm" variant={battleFilter === 'COMPLETED' ? 'primary' : 'secondary'} onClick={() => setBattleFilter('COMPLETED')}>
              Completed
            </Button>
            <Button size="sm" variant={battleFilter === 'MY_BATTLES' ? 'primary' : 'secondary'} onClick={() => setBattleFilter('MY_BATTLES')}>
              🛡️ Your Battles
            </Button>
          </div>

          {filteredBattles.length === 0 ? (
            <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <Swords size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)' }}>No battles found</h3>
              <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-md)' }}>
                Click [+ New Battle] above to set up a new coding battle.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingBattle(null);
                  setShowBattleWizard(true);
                }}
              >
                + Create New Battle
              </Button>
            </Card>
          ) : (
            <div className="problem-grid">
              {filteredBattles.map((b) => {
                const isLobby = b.status === 'LOBBY' || b.status === 'DRAFT' || b.status === 'SCHEDULED';
                const isLive = b.status === 'LIVE';
                const isDone = b.status === 'COMPLETED';
                const isCreator = b.created_by === user?.id || user?.role === 'admin' || user?.role === 'instructor';

                return (
                  <Card
                    key={b.id}
                    variant="glass"
                    className="problem-card"
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-sm)' }}
                  >
                    {/* Top Meta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isLive ? '#4ade80' : isDone ? 'var(--text-muted)' : 'var(--neon-cyan)',
                          background: 'var(--bg-elevated)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        ● {b.status}
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--neon-gold)', fontWeight: 700 }}>
                        {b.join_code}
                      </span>
                    </div>

                    {/* Title & Specs */}
                    <div>
                      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '4px 0 6px 0' }}>{b.title}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {b.duration_minutes} mins
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {b.coding_battle_participants?.[0]?.count || 1} / 25
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Code2 size={12} /> {b.coding_battle_problems?.[0]?.count || 1} problems
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'var(--space-xs)' }}>
                      <Link
                        href={`/code-arena/battles/${b.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        Open <ArrowRight size={14} />
                      </Link>

                      {/* Creator can edit battle anytime (Lobby, Live, or Completed) */}
                      {isCreator && (
                        <Button
                          size="sm"
                          variant="secondary"
                          title="Edit Battle & Certificate Details"
                          onClick={() => {
                            setEditingBattle(b);
                            setShowBattleWizard(true);
                          }}
                        >
                          <Edit size={14} /> Edit
                        </Button>
                      )}

                      {isLobby && (
                        <Button size="sm" onClick={() => handleStartBattle(b.id)} isLoading={startingId === b.id}>
                          <Play size={14} /> Start
                        </Button>
                      )}

                      {isLive && (
                        <Button size="sm" variant="danger" onClick={() => handleEndBattle(b.id)}>
                          <Square size={14} /> End
                        </Button>
                      )}

                      {isDone && (
                        <Link
                          href={`/code-arena/battles/${b.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <BarChart2 size={14} /> Results
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: INTERNAL PROBLEMS */}
      {activeTab === 'PROBLEMS' && (
        <Card variant="glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Your Internal Problems</h2>
            <Button size="sm" onClick={() => setShowCreateProblemModal(true)}>
              + Create Problem
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {problems.length ? (
              problems.map((problem) => (
                <div
                  key={problem.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    flexWrap: 'wrap',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                  }}
                >
                  <div>
                    <strong>{problem.title}</strong>
                    <div className="problem-meta">
                      <span className={`difficulty-${problem.difficulty}`}>{problem.difficulty}</span>
                      <span>{problem.source_type}</span>
                      <span>{problem.coding_problem_test_cases?.[0]?.count || 0} test cases</span>
                      <span>{problem.coding_submissions?.[0]?.count || 0} submissions</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    <Link href={`/instructor/code-arena/${problem.id}`} className="btn btn-secondary btn-sm">
                      Test cases
                    </Link>
                    <form
                      action={async () => {
                        await duplicateCodingProblem(problem.id);
                      }}
                    >
                      <Button size="sm" variant="ghost">
                        Duplicate
                      </Button>
                    </form>
                    <form
                      action={async () => {
                        await deleteCodingProblem(problem.id);
                        setProblems(problems.filter((p) => p.id !== problem.id));
                      }}
                    >
                      <Button size="sm" variant="danger">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-secondary">No coding problems created yet.</p>
            )}
          </div>
        </Card>
      )}

      {/* CREATE / EDIT BATTLE WIZARD MODAL */}
      {showBattleWizard && (
        <CreateBattleWizard
          isInstructor={true}
          batches={batches}
          initialBattle={editingBattle}
          onClose={() => {
            setShowBattleWizard(false);
            setEditingBattle(null);
          }}
          onSuccess={(savedBattle) => {
            setShowBattleWizard(false);
            setEditingBattle(null);
            setBattles((prev) => {
              const idx = prev.findIndex((b) => b.id === savedBattle.id);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = savedBattle;
                return copy;
              }
              return [savedBattle, ...prev];
            });
          }}
        />
      )}

      {/* STANDALONE CREATE INTERNAL PROBLEM MODAL */}
      {showCreateProblemModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Card
            variant="glass"
            style={{
              maxWidth: '580px',
              width: '100%',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }} className="text-gradient">
                Create Internal Problem
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateProblemModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <ProblemForm
              onSuccess={(newProblem) => {
                setShowCreateProblemModal(false);
                if (newProblem) setProblems([newProblem, ...problems]);
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
