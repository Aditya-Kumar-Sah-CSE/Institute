'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { 
  Swords, Plus, Code2, Trophy, ArrowRight, 
  User, Flame, CheckCircle2, Circle, Activity, Trash2
} from 'lucide-react';
import CreateBattleWizard from './CreateBattleWizard';
import MobileCodeArenaToggle from './MobileCodeArenaToggle';
import UpcomingContestsAlert from './contests/UpcomingContestsAlert';
import './CodeArena.css';

export default function CodeArenaClientHome({
  isInstructor,
  initialBattles,
  initialProblems,
  batches = [],
  profile,
  bceSolved = 0,
  externalAccounts = [],
}: {
  user?: any;
  isInstructor: boolean;
  initialBattles: any[];
  initialProblems: any[];
  batches?: any[];
  profile?: any;
  bceSolved?: number;
  externalAccounts?: any[];
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const [battles, setBattles] = useState<any[]>(initialBattles);
  const [visibleProblemsCount, setVisibleProblemsCount] = useState(6);

  const handleDeleteBattle = async (battleId: string) => {
    if (!window.confirm('Are you sure you want to delete this battle? This action cannot be undone.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/coding/battles/${battleId}`, {
        method: 'DELETE',
      });
      
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || 'Failed to delete battle.');
      }
      
      // Update local state
      setBattles(prev => prev.filter(b => b.id !== battleId));
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting the battle.');
    }
  };

  const handleJoinBattle = async () => {
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    setJoining(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const res = await fetch('/api/coding/battles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: cleanCode }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Battle not found or code invalid.');
      }

      setJoinSuccess('Successfully matched battle! Entering arena...');
      setTimeout(() => {
        window.location.href = `/code-arena/battles/${json.data.id}`;
      }, 1000);
    } catch (err: any) {
      setJoinError(err.message || 'Battle not found.');
    } finally {
      setJoining(false);
    }
  };

  const cfAccount = externalAccounts?.find(a => a.platform === 'CODEFORCES');
  const lcAccount = externalAccounts?.find(a => a.platform === 'LEETCODE');
  const ccAccount = externalAccounts?.find(a => a.platform === 'CODECHEF');
  
  const liveBattles = battles.filter((b) => b.status === 'LIVE');
  const liveBattlesCount = liveBattles.length;

  const filteredBattles = battles.filter(b => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'LIVE') return b.status === 'LIVE';
    if (activeTab === 'UPCOMING') return b.status === 'LOBBY';
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="code-arena-page-container">
      <MobileCodeArenaToggle />
      
      {/* 1. Premium Top Navigation */}
      <nav className="arena-top-navbar" style={{ justifyContent: 'center', padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/code-arena/problems" className="navbar-link">
            <Trophy size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Problem Hub
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
          <Link href="/code-arena/profile" className="navbar-link">
            <User size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Profile
          </Link>
        </div>
      </nav>

      {/* 2. Compact Premium Hero */}
      <div className="arena-dashboard-hero">
        <div className="hero-details">
          <div className="arena-pill-badge">
            <span className="pill-dot"></span>
            ⚡ SL CODE ARENA
          </div>
          <h1 className="hero-main-title">Compete. Solve. Improve.</h1>

          <div className="hero-action-buttons">
            <button className="btn-hero-primary" onClick={() => setShowWizard(true)}>
              <Plus size={14} /> Create Battle
            </button>
            <Link href="/code-arena/problems" className="btn-hero-secondary">
              Explore Problems <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="hero-summary-card">
          <div className="summary-header">
            <Activity size={12} className="text-neon-cyan animate-pulse" />
            <span className="summary-label">LIVE ARENA STATUS</span>
          </div>
          <div className="summary-grid">
            <div className="summary-stat">
              <span className="summary-val text-neon-cyan">{liveBattlesCount}</span>
              <span className="summary-lbl">Active Battles</span>
            </div>
            <div className="summary-stat">
              <span className="summary-val text-neon-purple">{initialProblems.length}</span>
              <span className="summary-lbl">Practice Problems</span>
            </div>
            <div className="summary-stat">
              <span className="summary-val text-neon-gold">
                {battles.filter(b => b.status === 'LOBBY').length}
              </span>
              <span className="summary-lbl">Upcoming</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Upcoming & Live Contests Alert (CodeChef, Codeforces, LeetCode) */}
      <UpcomingContestsAlert />

      {/* Removed Quick Actions Cards row */}

      {/* 4. Join Battle Via Invitation Code */}
      <div className="arena-invitation-container">
        <div className="arena-invitation-card">
          <div className="invitation-left">
            <div className="invitation-badge-icon">
              <Trophy size={20} />
            </div>
            <div className="invitation-message">
              <h3>Join a Battle</h3>
              <p>Enter the invitation code shared by your instructor or batchmates to get started.</p>
            </div>
          </div>

          <div className="invitation-input-row">
            <input
              type="text"
              className="invitation-input"
              placeholder="BCE-XXXXX"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinBattle(); }}
              disabled={joining}
              maxLength={12}
            />
            <button 
              className="invitation-btn" 
              onClick={handleJoinBattle} 
              disabled={joining || !joinCodeInput.trim()}
            >
              {joining ? 'Joining...' : 'Join Battle →'}
            </button>
          </div>
        </div>
        {joinError && <div className="join-feedback-error">❌ {joinError}</div>}
        {joinSuccess && <div className="join-feedback-success">✨ {joinSuccess}</div>}
      </div>

      {/* 5. Live Battle Spotlight (Only shown when live battles are active) */}
      {liveBattles.length > 0 && (
        <div className="arena-live-spotlight">
          <div className="spotlight-badge">
            <span className="live-pulse"></span>
            🔴 LIVE NOW
          </div>
          <div className="spotlight-content">
            <div className="spotlight-info">
              <h2>{liveBattles[0].title}</h2>
              <div className="spotlight-meta">
                <span>Duration: {liveBattles[0].duration_minutes} mins</span>
                <span className="meta-dot">•</span>
                <span>Type: {liveBattles[0].creator_role === 'FACULTY' ? 'Instructor Match' : 'Student Lounge'}</span>
                <span className="meta-dot">•</span>
                <span className="text-neon-gold">Code: {liveBattles[0].join_code}</span>
              </div>
            </div>
            <Link href={`/code-arena/battles/${liveBattles[0].id}`} className="spotlight-action-btn">
              Enter Arena <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* 6. Active & Recent Battles Grid */}
      <section id="battles-section" className="arena-battles-section">
        <div className="arena-section-header">
          <div>
            <h2>Active & Recent Battles</h2>

          </div>
          
          <div className="arena-tabs">
            <button 
              className={`arena-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              All
            </button>
            <button 
              className={`arena-tab-btn ${activeTab === 'LIVE' ? 'active' : ''}`}
              onClick={() => setActiveTab('LIVE')}
            >
              Live
            </button>
            <button 
              className={`arena-tab-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
              onClick={() => setActiveTab('UPCOMING')}
            >
              Upcoming
            </button>
            <button 
              className={`arena-tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
              onClick={() => setActiveTab('COMPLETED')}
            >
              Completed
            </button>
          </div>
        </div>

        {filteredBattles.length === 0 ? (
          <div className="arena-empty-card">
            <Swords size={32} className="text-muted" style={{ marginBottom: '8px' }} />
            <h3>No battles found</h3>
            <p className="text-secondary">There are no battles matching this criteria at the moment.</p>
            <Button size="sm" style={{ marginTop: 'var(--space-md)' }} onClick={() => setShowWizard(true)}>
              + Create Battle
            </Button>
          </div>
        ) : (
          <div className="arena-battles-grid">
            {filteredBattles.map((b) => {
              const isLive = b.status === 'LIVE';
              const isCompleted = b.status === 'COMPLETED';
              const borderGlowClass = isLive ? 'card-glow-live' : isCompleted ? 'card-glow-completed' : 'card-glow-upcoming';

              return (
                <div key={b.id} className={`arena-battle-card ${borderGlowClass}`}>
                  <div className="battle-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span suppressHydrationWarning className={`status-badge-styled ${b.status.toLowerCase()}`}>
                      <span className="status-dot"></span>
                      {b.status === 'LOBBY' ? 'UPCOMING' : b.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="join-code-disp">{b.join_code}</span>
                      {(b.created_by === profile?.id || isInstructor) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteBattle(b.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(239, 68, 68, 0.7)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                          title="Delete Battle"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="battle-card-body">
                    <h3 className="card-battle-title" title={b.title}>{b.title}</h3>
                    <div className="battle-details-row">
                      <span>🕒 {b.duration_minutes} mins</span>
                      <span>👨‍🏫 {b.creator_role === 'FACULTY' ? 'Instructor' : 'Student'}</span>
                    </div>
                  </div>

                  <div className="battle-card-footer">
                    <Link 
                      href={`/code-arena/battles/${b.id}`} 
                      className={`btn-battle-action ${isLive ? 'action-live' : isCompleted ? 'action-completed' : 'action-upcoming'}`}
                    >
                      {isLive ? 'Enter Battle →' : isCompleted ? 'View Results →' : 'Enter Lobby →'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Grid Columns (70/30) - Curated Problems + Progress Sidebar */}
      <div className="arena-split-layout">
        
        {/* Left main content - 70% */}
        <div className="arena-main-column">
          <section className="arena-problems-section">
            <h2 className="split-sect-title">Curated Practice Problems</h2>
            <p className="subtitle-desc-sm">Hand-picked coding problems to build your algorithmic fundamentals.</p>

            <div className="practice-rows-list">
              {initialProblems.slice(0, visibleProblemsCount).map((problem) => (
                <Link 
                  key={problem.id} 
                  href={`/code-arena/problems/${problem.id}`}
                  className="practice-row-item"
                >
                  <div className="row-item-left">
                    <div className="solve-status-box">
                      {problem.solved ? (
                        <CheckCircle2 size={16} className="text-neon-cyan" />
                      ) : (
                        <Circle size={16} className="text-muted" />
                      )}
                    </div>
                    <div className="row-problem-meta">
                      <span className="row-problem-title">{problem.title}</span>
                      <div className="row-tags-group">
                        <span className="source-label">{problem.source_type}</span>
                        {problem.tags?.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="tag-pill">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="row-item-right">
                    <span suppressHydrationWarning className={`difficulty-badge-styled difficulty-${problem.difficulty}`}>
                      {problem.difficulty}
                    </span>
                    <ArrowRight size={14} className="row-hover-arrow" />
                  </div>
                </Link>
              ))}
            </div>

            {visibleProblemsCount < initialProblems.length && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                <button
                  onClick={() => setVisibleProblemsCount((c) => c + 6)}
                  style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    color: 'var(--neon-cyan)',
                    padding: '10px 28px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'; }}
                >
                  Show More ({initialProblems.length - visibleProblemsCount} remaining)
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right side content - 30% */}
        <div className="arena-sidebar-column">
          <div className="arena-sidebar-widget">
            <h2 className="sidebar-widget-title">Your Progress</h2>
            
            <div className="sidebar-streak-row">
              <Flame size={20} className="text-neon-orange animate-pulse" />
              <div>
                <span className="streak-title">Daily Streak</span>
                <span className="streak-value" suppressHydrationWarning>{profile?.streak_days || 0} Days</span>
              </div>
            </div>

            <div className="stats-list-box">
              <div className="stat-list-item">
                <span className="lbl">SL Solved</span>
                <span className="val text-neon-cyan">{bceSolved}</span>
              </div>
              <div className="stat-list-item">
                <span className="lbl">CodeChef Rating</span>
                <span className="val" style={{ color: '#f59e0b' }}>{ccAccount ? ccAccount.rating || '—' : 'Unlinked'}</span>
              </div>
              <div className="stat-list-item">
                <span className="lbl">CodeChef Solved</span>
                <span className="val" style={{ color: '#f59e0b' }}>{ccAccount ? ccAccount.problems_solved || 0 : 'Unlinked'}</span>
              </div>
              <div className="stat-list-item">
                <span className="lbl">Codeforces Rating</span>
                <span className="val text-neon-purple">{cfAccount ? cfAccount.rating || '—' : 'Unlinked'}</span>
              </div>
              <div className="stat-list-item">
                <span className="lbl">CF Solved</span>
                <span className="val text-neon-purple">{cfAccount ? cfAccount.problems_solved || 0 : 'Unlinked'}</span>
              </div>
              <div className="stat-list-item">
                <span className="lbl">LeetCode Solved</span>
                <span className="val text-neon-yellow">{lcAccount ? lcAccount.problems_solved || 0 : 'Unlinked'}</span>
              </div>
            </div>

            {!lcAccount && (
              <div className="connect-link-warning">
                <p>Connect LeetCode profile to aggregate stats and unlock ratings achievements.</p>
                <Link href="/code-arena/profile" className="connect-action-btn-sm">
                  Connect LeetCode →
                </Link>
              </div>
            )}

            <div className="sidebar-widget-footer">
              <Link href="/code-arena/profile" className="btn-widget-link">
                View Detailed Profile <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Create Battle Wizard Modal */}
      {showWizard && (
        <CreateBattleWizard
          isInstructor={isInstructor}
          batches={batches}
          onClose={() => setShowWizard(false)}
          onSuccess={(newBattle) => {
            setBattles([newBattle, ...battles]);
            setShowWizard(false);
          }}
        />
      )}

    </div>
  );
}
