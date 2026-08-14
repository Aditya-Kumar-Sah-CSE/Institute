'use client';

import { useState, useEffect } from 'react';
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
  Plus,
  LogOut,
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

  const [teams, setTeams] = useState<any[]>([]);
  const [soloParticipants, setSoloParticipants] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  const fetchTeams = async () => {
    if (!battle?.team_mode) return;
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/teams`);
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams || []);
        setSoloParticipants(data.soloParticipants || []);
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [battle.id, battle.team_mode, participants]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);
    if (!newTeamName.trim()) return;
    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: newTeamName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create team');
      }
      setNewTeamName('');
      await fetchTeams();
    } catch (err: any) {
      setTeamError(err.message);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    setTeamError(null);
    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', teamId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to join team');
      }
      await fetchTeams();
    } catch (err: any) {
      setTeamError(err.message);
    }
  };

  const handleLeaveTeam = async () => {
    setTeamError(null);
    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to leave team');
      }
      await fetchTeams();
    } catch (err: any) {
      setTeamError(err.message);
    }
  };

  const myTeam = teams.find((t) => t.members.some((m: any) => m.student_id === currentUser?.id));

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
              {participantCount} / {battle.max_participants || 25}
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

        {/* Team Mode Play Panel */}
        {battle.team_mode && (
          <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
              👥 Team Roster & Ranks (Min: {battle.min_team_size}, Max: {battle.max_team_size} members)
            </div>

            {teamError && (
              <div style={{ fontSize: 'var(--text-xs)', color: '#f87171', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                {teamError}
              </div>
            )}

            {!myTeam ? (
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter custom team name..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: 'var(--text-xs)',
                    outline: 'none',
                  }}
                />
                <Button size="sm" type="submit" style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Create Team
                </Button>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  You are in team: <strong style={{ color: 'var(--neon-cyan)' }}>{myTeam.name}</strong> ({myTeam.members.length} member(s))
                </div>
                <Button variant="secondary" size="sm" onClick={handleLeaveTeam}>
                  <LogOut size={12} /> Leave Team
                </Button>
              </div>
            )}

            {/* List teams */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {teams.length === 0 ? (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px' }}>
                  No teams created yet. Create a team above or join via a teammate.
                </div>
              ) : (
                teams.map((t) => {
                  const isMyTeam = t.id === myTeam?.id;
                  const isFull = t.members.length >= (battle.max_team_size || 1);
                  const isUnderSize = t.members.length < (battle.min_team_size || 1);
                  return (
                    <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                          🚀 {t.name} {isMyTeam && <span style={{ color: 'var(--neon-cyan)', fontSize: '10px' }}>(Your Team)</span>}
                        </span>
                        {!myTeam && !isFull && (
                          <Button variant="secondary" size="sm" onClick={() => handleJoinTeam(t.id)}>
                            Join
                          </Button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {t.members.map((m: any) => (
                          <div key={m.student_id} style={{ fontSize: '10px', display: 'inline-flex', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                            {m.profiles?.full_name || 'Member'}
                          </div>
                        ))}
                      </div>
                      {isUnderSize && (
                        <div style={{ color: '#f87171', fontSize: '9px', marginTop: '6px' }}>
                          ⚠️ Needs at least {battle.min_team_size} members to compete (current: {t.members.length}).
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Solo / Unassigned Roster List (Default view or solo members under team play) */}
        <div style={{ width: '100%', textAlign: 'left', marginTop: battle.team_mode ? '12px' : '0px' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{battle.team_mode ? 'Solo / Unassigned Members' : 'Joined Roster'} ({battle.team_mode ? soloParticipants.length : participantCount})</span>
            <span>Limit: {battle.max_participants || 25} Max</span>
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
            {(battle.team_mode ? soloParticipants : participants).map((p, idx) => (
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
            {(battle.team_mode ? soloParticipants.length : participants.length) === 0 && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No participants joined yet.
              </div>
            )}
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
