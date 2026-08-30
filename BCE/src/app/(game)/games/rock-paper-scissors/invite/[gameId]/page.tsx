'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gamepad2, Users, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import '@/features/games/components/Games.css';

export default function RPSInviteJoinPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/games/session/${gameId}`);
        const data = await res.json();
        if (data.success) {
          setSession(data.session);
        } else {
          setErrorMsg(data.error || 'Game invitation not found');
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('Error loading game invite details');
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [gameId]);

  const handleJoin = async () => {
    try {
      setJoining(true);
      const res = await fetch('/api/games/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });
      const data = await res.json();

      if (data.success || data.isHost) {
        router.push(`/games/rock-paper-scissors/${gameId}`);
      } else {
        alert(data.error || 'Unable to join game session');
      }
    } catch (e) {
      console.error(e);
      alert('Error joining game session');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Validating Invite...</p>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60, maxWidth: 500 }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: 8 }}>Invalid or Expired Invite</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 20 }}>{errorMsg || 'This game session is no longer available'}</p>
        <Link href="/games" style={{ background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: '13px', fontWeight: 800, textDecoration: 'none' }}>
          Explore Games Lobby
        </Link>
      </div>
    );
  }

  const hostName = session.host?.name || 'Host Player';

  return (
    <div className="games-lobby-container" style={{ maxWidth: 520 }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 24, padding: 32, textAlign: 'center', backdropFilter: 'blur(16px)' }}>
        <span style={{ fontSize: '42px', display: 'block', marginBottom: 12 }}>🪨 📄 ✂️</span>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', padding: '4px 12px', borderRadius: 20, fontSize: '11px', fontWeight: 800, marginBottom: 16 }}>
          <Users size={12} /> GAME INVITATION
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 950, color: '#fff', margin: '0 0 8px 0' }}>
          {hostName} invited you to play!
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0' }}>
          Rock Paper Scissors • Best of {session.target_wins} Match
        </p>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 18px', marginBottom: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Host</span>
            <span style={{ fontWeight: 800, color: '#fff' }}>{hostName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Game Type</span>
            <span style={{ fontWeight: 800, color: '#c084fc' }}>Rock Paper Scissors</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Match Target</span>
            <span style={{ fontWeight: 800, color: '#fbbf24' }}>Best of {session.target_wins}</span>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}
        >
          {joining ? 'JOINING...' : 'JOIN MATCH NOW'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
