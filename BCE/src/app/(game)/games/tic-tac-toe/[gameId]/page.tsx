'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Copy, Share2, ArrowLeft, RefreshCw, Trophy, AlertTriangle, Users, Bot, CheckCircle2 } from 'lucide-react';
import '@/features/games/components/Games.css';

export default function TTTGameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [session, setSession] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMove, setSubmittingMove] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const supabase = createClient();
  const channelRef = useRef<any>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/games/session/${gameId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
      } else {
        alert(data.error || 'Game not found');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    fetchSession();

    // Realtime channel
    const channel = supabase.channel(`game_room_${gameId}`)
      .on('broadcast', { event: 'state_update' }, (payload) => {
        if (payload.payload?.session) {
          setSession(payload.payload.session);
        } else {
          fetchSession();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [gameId]);

  const broadcastUpdate = (updatedSession: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { session: updatedSession }
      });
    }
  };

  const handleReady = async () => {
    try {
      const res = await fetch('/api/games/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, readyState: true })
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        broadcastUpdate(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCellClick = async (position: number) => {
    if (submittingMove || !session || session.status !== 'playing') return;
    try {
      setSubmittingMove(true);
      const res = await fetch('/api/games/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, position })
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        broadcastUpdate(data.session);
      } else {
        alert(data.error || 'Invalid move');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingMove(false);
    }
  };

  const handleRematch = async () => {
    try {
      const res = await fetch('/api/games/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        broadcastUpdate(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForfeit = async () => {
    if (!confirm('Are you sure you want to forfeit this match?')) return;
    try {
      const res = await fetch('/api/games/forfeit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        broadcastUpdate(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/games/tic-tac-toe/invite/${gameId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60 }}>
        <RefreshCw size={32} className="spin" color="#06b6d4" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Loading Tic-Tac-Toe Arena...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '20px', color: '#fff' }}>Game Room Not Found</h3>
        <Link href="/games" style={{ color: '#06b6d4', fontSize: '13px', marginTop: 12, display: 'inline-block' }}>
          Back to Lobby
        </Link>
      </div>
    );
  }

  const isHost = session.host_id === currentUserId;
  const isGuest = session.guest_id === currentUserId;
  const isBot = session.mode === 'bot';
  const state = session.state || {};

  const hostName = session.host?.name || 'Host';
  const guestName = isBot ? `Bot (${session.difficulty})` : (session.guest?.name || 'Waiting Guest');

  const mySymbol = isHost ? (session.host_symbol || 'X') : (session.guest_symbol || 'O');
  const isMyTurn = isBot ? true : session.current_turn === currentUserId;
  const isMatchComplete = session.status === 'completed' || session.status === 'forfeited';

  const board: Array<string | null> = state.board || Array(9).fill(null);
  const winningLine: number[] | null = state.winningLine || null;

  // Winning Line SVG coordinates mapping
  const getLineCoordinates = (line: number[]) => {
    const coords: Record<string, { x1: string; y1: string; x2: string; y2: string }> = {
      '0,1,2': { x1: '5%', y1: '16.6%', x2: '95%', y2: '16.6%' },
      '3,4,5': { x1: '5%', y1: '50%', x2: '95%', y2: '50%' },
      '6,7,8': { x1: '5%', y1: '83.3%', x2: '95%', y2: '83.3%' },
      '0,3,6': { x1: '16.6%', y1: '5%', x2: '16.6%', y2: '95%' },
      '1,4,7': { x1: '50%', y1: '5%', x2: '50%', y2: '95%' },
      '2,5,8': { x1: '83.3%', y1: '5%', x2: '83.3%', y2: '95%' },
      '0,4,8': { x1: '5%', y1: '5%', x2: '95%', y2: '95%' },
      '2,4,6': { x1: '95%', y1: '5%', x2: '5%', y2: '95%' }
    };
    return coords[line.join(',')] || { x1: '0', y1: '0', x2: '0', y2: '0' };
  };

  return (
    <div className="games-lobby-container" style={{ maxWidth: 650 }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link href="/games" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
          <ArrowLeft size={14} /> Exit Game
        </Link>
        <span style={{ fontSize: '11px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', padding: '4px 10px', borderRadius: 20, fontWeight: 800 }}>
          TIC-TAC-TOE • {session.mode.toUpperCase()}
        </span>
      </div>

      {/* WAITING ROOM OVERLAY */}
      {session.status === 'waiting' && !isBot && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px dashed rgba(6, 182, 212, 0.4)', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <Users size={36} color="#06b6d4" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0' }}>Waiting for Opponent...</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0' }}>Share this invite link to start playing</p>

          <div style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/games/tic-tac-toe/invite/${gameId}`}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#06b6d4', fontSize: '11px' }}
            />
            <button
              onClick={copyInviteLink}
              style={{ background: 'linear-gradient(135deg, #06b6d4, #ec4899)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copiedLink ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {/* READY ROOM STATE */}
      {session.status === 'ready' && !isBot && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 24, padding: 24, textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginBottom: 12 }}>Players Joined!</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{hostName} (X)</span>
              <span style={{ fontSize: '10px', display: 'block', color: session.host_ready ? '#10b981' : '#f59e0b' }}>
                {session.host_ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{guestName} (O)</span>
              <span style={{ fontSize: '10px', display: 'block', color: session.guest_ready ? '#10b981' : '#f59e0b' }}>
                {session.guest_ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
          </div>
          <button
            onClick={handleReady}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 10, fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
          >
            I AM READY!
          </button>
        </div>
      )}

      {/* PLAYERS & TURN STATUS BAR */}
      {(session.status === 'playing' || isMatchComplete) && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '14px 20px', marginBottom: 20 }}>
            <div style={{ opacity: (!isMatchComplete && session.current_turn === session.host_id) ? 1 : 0.6 }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#06b6d4' }}>{hostName} (X)</span>
              {session.current_turn === session.host_id && !isMatchComplete && (
                <span style={{ fontSize: '9px', background: 'rgba(6,182,212,0.2)', color: '#06b6d4', padding: '2px 6px', borderRadius: 6, marginLeft: 6, fontWeight: 800 }}>TURN</span>
              )}
            </div>

            <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>VS</span>

            <div style={{ opacity: (!isMatchComplete && session.current_turn === session.guest_id) ? 1 : 0.6 }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#ec4899' }}>{guestName} (O)</span>
              {session.current_turn === session.guest_id && !isMatchComplete && (
                <span style={{ fontSize: '9px', background: 'rgba(236,72,153,0.2)', color: '#ec4899', padding: '2px 6px', borderRadius: 6, marginLeft: 6, fontWeight: 800 }}>TURN</span>
              )}
            </div>
          </div>

          {/* 3X3 NEON GRID BOARD */}
          <div className="ttt-board-container">
            {/* SVG Strike Line Overlay */}
            {winningLine && (
              <svg className="ttt-winning-line" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line
                  {...getLineCoordinates(winningLine)}
                  stroke="#facc15"
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 10px #facc15)' }}
                />
              </svg>
            )}

            {board.map((cell, idx) => (
              <button
                key={idx}
                disabled={cell !== null || !isMyTurn || submittingMove || isMatchComplete}
                onClick={() => handleCellClick(idx)}
                className={`ttt-cell ${cell === 'X' ? 'ttt-cell-x' : cell === 'O' ? 'ttt-cell-o' : ''}`}
              >
                {cell}
              </button>
            ))}
          </div>

          {/* MATCH RESULT OVERLAY */}
          {isMatchComplete && (
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 24, padding: 32, textAlign: 'center', marginTop: 24 }}>
              <Trophy size={48} color="#facc15" style={{ margin: '0 auto 12px auto' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 950, color: '#fff', margin: '0 0 6px 0' }}>
                MATCH CONCLUDED!
              </h2>
              <p style={{ fontSize: '14px', fontWeight: 800, color: session.winner_id === currentUserId ? '#10b981' : session.winner_id ? '#ef4444' : '#f59e0b', marginBottom: 20 }}>
                {session.winner_id === currentUserId ? '🏆 YOU WIN!' : session.winner_id ? 'OPPONENT WON THE MATCH' : 'MATCH DRAW!'}
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={handleRematch}
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #ec4899)', border: 'none', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
                >
                  REMATCH
                </button>
                <Link
                  href="/games"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: '13px', display: 'inline-block' }}
                >
                  Back to Lobby
                </Link>
              </div>
            </div>
          )}

          {/* Forfeit option */}
          {session.status === 'playing' && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={handleForfeit} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                Forfeit Match
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
