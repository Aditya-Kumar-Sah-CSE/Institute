'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Copy, Share2, ArrowLeft, RefreshCw, Trophy, AlertTriangle, Users, Bot, CheckCircle2 } from 'lucide-react';
import '@/features/games/components/Games.css';

type RPSMove = 'rock' | 'paper' | 'scissors';

export default function RPSGameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [session, setSession] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMove, setSubmittingMove] = useState(false);

  // Realtime & Countdown State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Fetch session
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
      console.error('Fetch session error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get current auth user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    fetchSession();

    // 2. Subscribe to Supabase Realtime Broadcast channel
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

  // Broadcast helper
  const broadcastUpdate = (updatedSession: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { session: updatedSession }
      });
    }
  };

  // Ready handler
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

  // Submit Move Handler
  const handleMakeMove = async (choice: RPSMove) => {
    if (submittingMove || !session || session.status !== 'playing') return;
    try {
      setSubmittingMove(true);
      const res = await fetch('/api/games/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, choice })
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        broadcastUpdate(data.session);
      } else {
        alert(data.error || 'Failed to submit move');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingMove(false);
    }
  };

  // Rematch Handler
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

  // Forfeit Handler
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

  // Copy Invite Link
  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/games/rock-paper-scissors/invite/${gameId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60 }}>
        <RefreshCw size={32} className="spin" color="#00f0ff" style={{ margin: '0 auto 16px auto' }} />
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Loading Game Room...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="games-lobby-container" style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ fontSize: '20px', color: '#fff' }}>Game Room Not Found</h3>
        <Link href="/games" style={{ color: '#00f0ff', fontSize: '13px', marginTop: 12, display: 'inline-block' }}>
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

  const myMove = isHost ? state.hostMove : state.guestMove;
  const opponentMove = isHost ? state.guestMove : state.hostMove;

  const isMatchComplete = session.status === 'completed' || session.status === 'forfeited';

  return (
    <div className="games-lobby-container" style={{ maxWidth: 700 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link href="/games" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
          <ArrowLeft size={14} /> Exit Game
        </Link>
        <span style={{ fontSize: '11px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', padding: '4px 10px', borderRadius: 20, fontWeight: 800 }}>
          BEST OF {session.target_wins} MATCH
        </span>
      </div>

      {/* WAITING ROOM OVERLAY FOR FRIEND MODE */}
      {session.status === 'waiting' && !isBot && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px dashed rgba(0, 240, 255, 0.4)', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 24 }}>
          <Users size={36} color="#00f0ff" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '0 0 6px 0' }}>Waiting for Friend to Join...</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0' }}>Share this unique invite link with your opponent</p>

          <div style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/games/rock-paper-scissors/invite/${gameId}`}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#00f0ff', fontSize: '11px' }}
            />
            <button
              onClick={copyInviteLink}
              style={{ background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copiedLink ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {/* READY ROOM STATE */}
      {session.status === 'ready' && !isBot && (
        <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 24, padding: 24, textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginBottom: 12 }}>Players Joined!</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{hostName}</span>
              <span style={{ fontSize: '10px', display: 'block', color: session.host_ready ? '#10b981' : '#f59e0b' }}>
                {session.host_ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{guestName}</span>
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

      {/* ACTIVE GAME SCOREBOARD & ARENA */}
      {(session.status === 'playing' || isMatchComplete) && (
        <>
          {/* Scoreboard */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', display: 'block' }}>{hostName.toUpperCase()}</span>
              <span style={{ fontSize: '28px', fontWeight: 950, color: '#00f0ff' }}>{state.hostScore || 0}</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#a855f7', background: 'rgba(168,85,247,0.15)', padding: '2px 8px', borderRadius: 8 }}>
                ROUND {state.round || 1}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: 4 }}>First to {session.target_wins}</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', display: 'block' }}>{guestName.toUpperCase()}</span>
              <span style={{ fontSize: '28px', fontWeight: 950, color: '#ec4899' }}>{state.guestScore || 0}</span>
            </div>
          </div>

          {/* SIMULTANEOUS MOVE REVEAL & CLASH ARENA */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 24, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {state.movesRevealed && state.history?.length > 0 ? (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>ROUND RESULT</span>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, margin: '20px 0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '48px', display: 'block' }}>
                      {state.history[state.history.length - 1].hostMove === 'rock' ? '🪨' : state.history[state.history.length - 1].hostMove === 'paper' ? '📄' : '✂️'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{hostName}</span>
                  </div>

                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>VS</span>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '48px', display: 'block' }}>
                      {state.history[state.history.length - 1].guestMove === 'rock' ? '🪨' : state.history[state.history.length - 1].guestMove === 'paper' ? '📄' : '✂️'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{guestName}</span>
                  </div>
                </div>

                <div style={{ fontSize: '16px', fontWeight: 900, color: state.history[state.history.length - 1].result === 'host_win' ? '#00f0ff' : state.history[state.history.length - 1].result === 'guest_win' ? '#ec4899' : '#f59e0b' }}>
                  {state.history[state.history.length - 1].result === 'host_win' ? `${hostName} Wins Round!` : state.history[state.history.length - 1].result === 'guest_win' ? `${guestName} Wins Round!` : 'Round Draw!'}
                </div>
              </div>
            ) : myMove ? (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>✓ Move Submitted!</span>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: 6 }}>Waiting for opponent move...</p>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>SELECT YOUR MOVE</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: 4 }}>Both players choose simultaneously</span>
              </div>
            )}
          </div>

          {/* CHOICE CARDS SELECTION GRID */}
          {session.status === 'playing' && !myMove && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              <button
                onClick={() => handleMakeMove('rock')}
                disabled={submittingMove}
                className="rps-choice-btn"
              >
                <span style={{ fontSize: '42px' }}>🪨</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>ROCK</span>
              </button>

              <button
                onClick={() => handleMakeMove('paper')}
                disabled={submittingMove}
                className="rps-choice-btn"
              >
                <span style={{ fontSize: '42px' }}>📄</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>PAPER</span>
              </button>

              <button
                onClick={() => handleMakeMove('scissors')}
                disabled={submittingMove}
                className="rps-choice-btn"
              >
                <span style={{ fontSize: '42px' }}>✂️</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>SCISSORS</span>
              </button>
            </div>
          )}

          {/* MATCH COMPLETE OVERLAY */}
          {isMatchComplete && (
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 24, padding: 32, textAlign: 'center', marginBottom: 24 }}>
              <Trophy size={48} color="#facc15" style={{ margin: '0 auto 12px auto' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 950, color: '#fff', margin: '0 0 6px 0' }}>
                MATCH CONCLUDED!
              </h2>
              <p style={{ fontSize: '14px', fontWeight: 800, color: session.winner_id === currentUserId ? '#10b981' : session.winner_id ? '#ef4444' : '#f59e0b', marginBottom: 20 }}>
                {session.winner_id === currentUserId ? '🏆 YOU VICTORY!' : session.winner_id ? 'OPPONENT WON THE MATCH' : 'MATCH DRAW!'}
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={handleRematch}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', border: 'none', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
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

          {/* Forfeit Option */}
          {session.status === 'playing' && (
            <div style={{ textAlign: 'center' }}>
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
