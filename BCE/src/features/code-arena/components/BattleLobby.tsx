'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Swords,
  Users,
  Clock,
  Code2,
  Copy,
  Share2,
  Play,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface BattleLobbyProps {
  battle: any;
  problemsCount: number;
  participants: any[];
  currentUser: any;
  isHost: boolean;
  onBattleStarted: (updatedBattle: any) => void;
}

export default function BattleLobby({
  battle,
  problemsCount,
  participants,
  currentUser,
  isHost,
  onBattleStarted,
}: BattleLobbyProps) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const joinCode = battle.join_code || 'BCE-ROOM';
  const participantCount = participants.length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    const shareText = `🔥 BCE Coding Battle\n\nBattle: ${battle.title}\nJoin Code: ${joinCode}\nDuration: ${battle.duration_minutes} minutes\nProblems: ${problemsCount}`;
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `BCE Coding Battle — ${battle.title}`,
          text: shareText,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      console.error('Failed to share');
    }
  };

  const handleStartBattle = async () => {
    setStarting(true);
    setStartError(null);

    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/start`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to start battle');
      }

      onBattleStarted(data.battle);
    } catch (err: any) {
      setStartError(err.message || 'Error starting battle');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: 'var(--space-xl) auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
      }}
    >
      <Card
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-lg)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))',
            color: 'var(--neon-cyan)',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--neon-cyan)',
          }}
        >
          <Swords size={32} />
        </div>

        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '12px',
              background: 'rgba(6,182,212,0.1)',
              color: 'var(--neon-cyan)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              marginBottom: 'var(--space-xs)',
            }}
          >
            <Sparkles size={14} /> LOBBY WAITING ROOM
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: '4px 0' }}>
            {battle.title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {battle.description || 'Get ready! The host will start the battle soon.'}
          </p>
        </div>

        {/* Battle Spec Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-md)',
            width: '100%',
            marginTop: 'var(--space-sm)',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Code2 size={18} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Problems</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{problemsCount}</div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Clock size={18} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Duration</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{battle.duration_minutes} Mins</div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
            }}
          >
            <Users size={18} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Participants</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>
              {participantCount} / 25
            </div>
          </div>
        </div>

        {/* Join Code Box */}
        <div
          style={{
            width: '100%',
            background: 'rgba(6,182,212,0.05)',
            border: '1px dashed var(--neon-cyan)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'left' }}>
              Battle Code
            </div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '2px', color: 'var(--neon-cyan)' }}>
              {joinCode}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="ghost" onClick={handleCopyCode}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Code'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleShare}>
              {shared ? <Check size={16} /> : <Share2 size={16} />}
              {shared ? 'Copied Link' : 'Share'}
            </Button>
          </div>
        </div>

        {/* Roster List */}
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Joined Roster ({participantCount})</span>
            <span>Limit: 25 Max</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {participants.map((p, idx) => (
              <div
                key={p.student_id || idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: p.student_id === currentUser?.id ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                  border: p.student_id === currentUser?.id ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: p.student_id === currentUser?.id ? 700 : 500,
                }}
              >
                <span>{p.student?.full_name || p.profiles?.full_name || `Participant ${idx + 1}`}</span>
                {p.student_id === currentUser?.id && <span style={{ color: 'var(--neon-cyan)' }}>(You)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Start Error Alert */}
        {startError && (
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: 'var(--text-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} /> {startError}
          </div>
        )}

        {/* Action Controls */}
        <div style={{ width: '100%', marginTop: 'var(--space-md)' }}>
          {isHost ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartBattle}
              disabled={starting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                fontWeight: 800,
                fontSize: 'var(--text-md)',
              }}
            >
              <Play size={20} /> {starting ? 'Starting Battle…' : 'Start Battle'}
            </Button>
          ) : (
            <div
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
              }}
            >
              ⏳ Waiting for host to start battle...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
