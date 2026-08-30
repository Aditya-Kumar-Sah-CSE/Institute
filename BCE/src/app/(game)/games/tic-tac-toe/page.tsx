'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, Users, ArrowLeft, Play, Sparkles } from 'lucide-react';
import '@/features/games/components/Games.css';

export default function TTTSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'bot' | 'friend'>('bot');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [creating, setCreating] = useState(false);

  const handleLaunch = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'tic_tac_toe',
          mode,
          difficulty
        })
      });
      const data = await res.json();
      if (data.success && data.gameId) {
        router.push(`/games/tic-tac-toe/${data.gameId}`);
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

      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 24, padding: 32, backdropFilter: 'blur(16px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: '36px', display: 'block', marginBottom: 8 }}>❌ ⭕</span>
          <h2 style={{ fontSize: '24px', fontWeight: 950, color: '#fff', margin: '0 0 6px 0' }}>Tic-Tac-Toe</h2>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>3x3 Neon Grid Arena</span>
        </div>

        {/* Mode Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 8 }}>GAME MODE</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setMode('bot')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: mode === 'bot' ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)', background: mode === 'bot' ? 'rgba(6,182,212,0.15)' : 'transparent', color: mode === 'bot' ? '#06b6d4' : '#94a3b8', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Bot size={16} /> Play vs Bot
            </button>
            <button
              onClick={() => setMode('friend')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: mode === 'friend' ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)', background: mode === 'friend' ? 'rgba(6,182,212,0.15)' : 'transparent', color: mode === 'friend' ? '#06b6d4' : '#94a3b8', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
            >
              <Users size={16} /> Invite Friend
            </button>
          </div>
        </div>

        {/* Bot Difficulty */}
        {mode === 'bot' && (
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: 8 }}>BOT DIFFICULTY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'easy', label: 'Easy (Random)' },
                { id: 'medium', label: 'Medium (Strategic)' },
                { id: 'hard', label: 'Hard (Unbeatable Minimax)' }
              ].map(diff => (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id as any)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: difficulty === diff.id ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', background: difficulty === diff.id ? 'rgba(236,72,153,0.15)' : 'transparent', color: difficulty === diff.id ? '#ec4899' : '#94a3b8', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleLaunch}
          disabled={creating}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #ec4899)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 20px rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Play size={16} /> {creating ? 'LAUNCHING...' : 'START MATCH'}
        </button>
      </div>
    </div>
  );
}
