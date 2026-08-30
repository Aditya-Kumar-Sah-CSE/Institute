'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, Users, ArrowLeft, Play, Sparkles } from 'lucide-react';
import '@/features/games/components/Games.css';

export default function RPSSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'bot' | 'friend'>('bot');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [targetWins, setTargetWins] = useState<number>(3);
  const [creating, setCreating] = useState(false);

  const handleLaunch = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'rock_paper_scissors',
          mode,
          difficulty,
          targetWins
        })
      });
      const data = await res.json();
      if (data.success && data.gameId) {
        router.push(`/games/rock-paper-scissors/${data.gameId}`);
      } else {
        alert(data.error || 'Failed to create game');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating game');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="games-lobby-container" style={{ maxWidth: 600 }}>
      <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Games Lobby
      </Link>

      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 24, padding: 32, backdropFilter: 'blur(16px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '36px', display: 'block', marginBottom: 8 }}>🪨 📄 ✂️</span>
          <h2 style={{ fontSize: '24px', fontWeight: 950, color: '#fff', margin: '0 0 6px 0' }}>Rock Paper Scissors</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Configure your match rules and launch</span>
        </div>

        {/* Mode Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 8 }}>GAME MODE</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setMode('bot')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: mode === 'bot' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)', background: mode === 'bot' ? 'rgba(168,85,247,0.15)' : 'transparent', color: mode === 'bot' ? '#c084fc' : '#94a3b8', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Bot size={16} /> Play vs Bot
            </button>
            <button
              onClick={() => setMode('friend')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: mode === 'friend' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)', background: mode === 'friend' ? 'rgba(168,85,247,0.15)' : 'transparent', color: mode === 'friend' ? '#c084fc' : '#94a3b8', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Users size={16} /> Invite Friend
            </button>
          </div>
        </div>

        {/* Bot Difficulty */}
        {mode === 'bot' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 8 }}>BOT DIFFICULTY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: difficulty === diff ? '2px solid #00f0ff' : '1px solid rgba(255,255,255,0.1)', background: difficulty === diff ? 'rgba(0,240,255,0.15)' : 'transparent', color: difficulty === diff ? '#00f0ff' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Match Length */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 8 }}>MATCH LENGTH</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 3, 5].map(wins => (
              <button
                key={wins}
                onClick={() => setTargetWins(wins)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: targetWins === wins ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)', background: targetWins === wins ? 'rgba(251,191,36,0.15)' : 'transparent', color: targetWins === wins ? '#fbbf24' : '#94a3b8', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
              >
                Best of {wins}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleLaunch}
          disabled={creating}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 20px rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Play size={16} /> {creating ? 'LAUNCHING...' : 'START MATCH'}
        </button>
      </div>
    </div>
  );
}
