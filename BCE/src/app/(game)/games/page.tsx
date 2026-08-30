'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gamepad2, Bot, Users, Trophy, Flame, Play, Plus, RefreshCw, Sparkles, Award, ArrowLeft } from 'lucide-react';
import '@/features/games/components/Games.css';

interface UserStats {
  rps_played: number;
  rps_wins: number;
  rps_losses: number;
  rps_draws: number;
  rps_current_streak: number;
  rps_best_streak: number;
  ttt_played: number;
  ttt_wins: number;
  ttt_losses: number;
  ttt_draws: number;
  ttt_current_streak: number;
  ttt_best_streak: number;
}

export default function GamesLobbyPage() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<'rock_paper_scissors' | 'tic_tac_toe'>('rock_paper_scissors');
  const [selectedMode, setSelectedMode] = useState<'bot' | 'friend'>('bot');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedTargetWins, setSelectedTargetWins] = useState<number>(3);
  const [creating, setCreating] = useState(false);

  const fetchLobbyData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentMatches(data.recentMatches || []);
      }
    } catch (e) {
      console.error('Failed to load lobby stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbyData();
  }, []);

  const handleCreateGame = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: selectedGameType,
          mode: selectedMode,
          difficulty: selectedDifficulty,
          targetWins: selectedTargetWins
        })
      });
      const data = await res.json();
      if (data.success && data.gameId) {
        const routePrefix = selectedGameType === 'rock_paper_scissors' ? '/games/rock-paper-scissors' : '/games/tic-tac-toe';
        router.push(`${routePrefix}/${data.gameId}`);
      } else {
        alert(data.error || 'Failed to create game session');
      }
    } catch (e) {
      console.error('Error creating game:', e);
      alert('Network error while creating game');
    } finally {
      setCreating(false);
    }
  };

  const openCreateFor = (type: 'rock_paper_scissors' | 'tic_tac_toe', mode: 'bot' | 'friend') => {
    setSelectedGameType(type);
    setSelectedMode(mode);
    setShowCreateModal(true);
  };

  return (
    <div className="games-lobby-container">
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Hero Header */}
      <div className="games-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.25)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, color: '#00f0ff', marginBottom: 12 }}>
          <Gamepad2 size={14} /> SMART LEARN ARCADE
        </div>
        <h1 className="games-hero-title">Multiplayer Games Hub</h1>
        <p className="games-hero-subtitle">
          Challenge strategic AI bots or play real-time multiplayer matches with friends.
        </p>
      </div>

      {/* Overview Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'grid', placeItems: 'center' }}>
              <Trophy size={20} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, display: 'block' }}>TOTAL WINS</span>
              <span style={{ fontSize: '18px', fontWeight: 950, color: '#fff' }}>{(stats.rps_wins || 0) + (stats.ttt_wins || 0)}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', display: 'grid', placeItems: 'center' }}>
              <Flame size={20} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, display: 'block' }}>BEST STREAK</span>
              <span style={{ fontSize: '18px', fontWeight: 950, color: '#f97316' }}>{Math.max(stats.rps_best_streak || 0, stats.ttt_best_streak || 0)} Wins</span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'grid', placeItems: 'center' }}>
              <Award size={20} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, display: 'block' }}>GAMES PLAYED</span>
              <span style={{ fontSize: '18px', fontWeight: 950, color: '#c084fc' }}>{(stats.rps_played || 0) + (stats.ttt_played || 0)} Matches</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Cards */}
      <div className="games-grid">
        {/* Game 1: Rock Paper Scissors */}
        <div className="game-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="game-card-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <Sparkles size={12} /> BATTLE ROYALE
              </span>
              <span style={{ fontSize: '24px' }}>🪨 📄 ✂️</span>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 6px 0', color: '#fff' }}>
              Rock Paper Scissors
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Classic strategy clash. Play single-round or multi-round matches with adaptive pattern-tracking AI or real-time friends.
            </p>

            {stats && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#64748b' }}>Record: <strong style={{ color: '#fff' }}>{stats.rps_wins}W - {stats.rps_losses}L - {stats.rps_draws}D</strong></span>
                <span style={{ color: '#f97316', fontWeight: 800 }}>🔥 Streak: {stats.rps_current_streak}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => openCreateFor('rock_paper_scissors', 'bot')}
              style={{ flex: 1, background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', border: 'none', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Bot size={14} /> VS BOT
            </button>
            <button
              onClick={() => openCreateFor('rock_paper_scissors', 'friend')}
              style={{ flex: 1, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', padding: '10px 14px', borderRadius: 10, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Users size={14} /> VS FRIEND
            </button>
          </div>
        </div>

        {/* Game 2: Tic-Tac-Toe */}
        <div className="game-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="game-card-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <Sparkles size={12} /> MINIMAX ENGINE
              </span>
              <span style={{ fontSize: '24px' }}>❌ ⭕</span>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 6px 0', color: '#fff' }}>
              Tic-Tac-Toe
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              3x3 Neon Grid. Test your mind against our unbeatable Minimax AI or send an instant invite link to duel a friend.
            </p>

            {stats && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#64748b' }}>Record: <strong style={{ color: '#fff' }}>{stats.ttt_wins}W - {stats.ttt_losses}L - {stats.ttt_draws}D</strong></span>
                <span style={{ color: '#f97316', fontWeight: 800 }}>🔥 Streak: {stats.ttt_current_streak}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => openCreateFor('tic_tac_toe', 'bot')}
              style={{ flex: 1, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Bot size={14} /> VS BOT
            </button>
            <button
              onClick={() => openCreateFor('tic_tac_toe', 'friend')}
              style={{ flex: 1, background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#06b6d4', padding: '10px 14px', borderRadius: 10, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Users size={14} /> VS FRIEND
            </button>
          </div>
        </div>
      </div>

      {/* Recent Matches Section */}
      <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 20, padding: 24, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} color="#00f0ff" /> Recent Matches
          </h4>
          <button onClick={fetchLobbyData} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
            No recent matches found. Start a game above to track your results!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentMatches.map((m) => {
              const isRPS = m.game_type === 'rock_paper_scissors';
              const opponentName = m.mode === 'bot' ? `Bot (${m.difficulty})` : (m.guest?.name || 'Waiting Friend');
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '18px' }}>{isRPS ? '🪨' : '❌'}</span>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', display: 'block' }}>
                        {isRPS ? 'Rock Paper Scissors' : 'Tic-Tac-Toe'} vs {opponentName}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        Mode: {m.mode.toUpperCase()} • Status: {m.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Link href={isRPS ? `/games/rock-paper-scissors/${m.id}` : `/games/tic-tac-toe/${m.id}`} style={{ fontSize: '11px', fontWeight: 800, color: '#00f0ff' }}>
                    View Match →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE GAME MODAL */}
      {showCreateModal && (
        <div className="game-modal-overlay">
          <div className="game-modal-content">
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 16px 0' }}>
              Create Game Session
            </h3>

            {/* Game Type Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>GAME TYPE</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedGameType('rock_paper_scissors')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: selectedGameType === 'rock_paper_scissors' ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)', background: selectedGameType === 'rock_paper_scissors' ? 'rgba(0,240,255,0.15)' : 'transparent', color: selectedGameType === 'rock_paper_scissors' ? '#00f0ff' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  🪨 Rock Paper Scissors
                </button>
                <button
                  onClick={() => setSelectedGameType('tic_tac_toe')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: selectedGameType === 'tic_tac_toe' ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', background: selectedGameType === 'tic_tac_toe' ? 'rgba(236,72,153,0.15)' : 'transparent', color: selectedGameType === 'tic_tac_toe' ? '#ec4899' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  ❌ Tic-Tac-Toe
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>MODE</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedMode('bot')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: selectedMode === 'bot' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)', background: selectedMode === 'bot' ? 'rgba(168,85,247,0.15)' : 'transparent', color: selectedMode === 'bot' ? '#c084fc' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  🤖 VS Bot
                </button>
                <button
                  onClick={() => setSelectedMode('friend')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: selectedMode === 'friend' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)', background: selectedMode === 'friend' ? 'rgba(168,85,247,0.15)' : 'transparent', color: selectedMode === 'friend' ? '#c084fc' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                >
                  👥 VS Friend
                </button>
              </div>
            </div>

            {/* Difficulty Selector (Bot Mode) */}
            {selectedMode === 'bot' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>BOT DIFFICULTY</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: selectedDifficulty === diff ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)', background: selectedDifficulty === diff ? 'rgba(56,189,248,0.15)' : 'transparent', color: selectedDifficulty === diff ? '#38bdf8' : '#94a3b8', fontWeight: 800, fontSize: '11px', cursor: 'pointer', textTransform: 'uppercase' }}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target Wins Selector (RPS) */}
            {selectedGameType === 'rock_paper_scissors' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 6 }}>MATCH LENGTH</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 3, 5].map(wins => (
                    <button
                      key={wins}
                      onClick={() => setSelectedTargetWins(wins)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: selectedTargetWins === wins ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)', background: selectedTargetWins === wins ? 'rgba(251,191,36,0.15)' : 'transparent', color: selectedTargetWins === wins ? '#fbbf24' : '#94a3b8', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                    >
                      Best of {wins}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleCreateGame}
                disabled={creating}
                style={{ flex: 1, background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
              >
                {creating ? 'Creating...' : 'LAUNCH GAME'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
