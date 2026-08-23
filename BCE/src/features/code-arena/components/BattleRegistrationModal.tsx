'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, User, Trophy, Clock, X, AlertCircle, ShieldCheck } from 'lucide-react';

interface BattleRegistrationModalProps {
  battle: any;
  user: any;
  onClose: () => void;
  onSuccess: (battle: any) => void;
}

export default function BattleRegistrationModal({
  battle,
  user,
  onClose,
  onSuccess,
}: BattleRegistrationModalProps) {
  const isTeamBattle = Boolean(battle?.team_mode);
  const [mode, setMode] = useState<'INDIVIDUAL' | 'TEAM'>(isTeamBattle ? 'TEAM' : 'INDIVIDUAL');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (mode === 'TEAM' && isTeamBattle && !teamName.trim()) {
      setError('Please enter a team name to register.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/coding/battles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: battle.join_code || battle.id,
          teamName: mode === 'TEAM' ? teamName.trim() : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Registration failed.');
      }

      onSuccess(json.data || battle);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1100,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Card
        variant="glass"
        style={{
          maxWidth: '500px',
          width: '100%',
          borderRadius: '16px',
          background: 'var(--bg-elevated, #0b0f19)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          padding: '24px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--neon-cyan)',
            }}
          >
            <Trophy size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Battle Registration</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Register before entering the arena</span>
          </div>
        </div>

        {/* Battle Summary Card */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '6px' }}>
            {battle.title}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> {battle.duration_minutes} mins
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={13} /> Limit: {battle.max_participants || 25} Max
            </span>
            <span style={{ color: 'var(--neon-gold)', fontWeight: 700 }}>
              Code: {battle.join_code}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>
            CHOOSE REGISTRATION MODE
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setMode('INDIVIDUAL')}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: mode === 'INDIVIDUAL' ? '2px solid var(--neon-cyan)' : '1px solid rgba(255,255,255,0.1)',
                background: mode === 'INDIVIDUAL' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.02)',
                color: mode === 'INDIVIDUAL' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <User size={20} style={{ margin: '0 auto 6px auto', color: mode === 'INDIVIDUAL' ? 'var(--neon-cyan)' : 'inherit' }} />
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Individual (Solo)</div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>Compete alone</div>
            </button>

            <button
              type="button"
              onClick={() => setMode('TEAM')}
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: mode === 'TEAM' ? '2px solid var(--neon-purple)' : '1px solid rgba(255,255,255,0.1)',
                background: mode === 'TEAM' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                color: mode === 'TEAM' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Users size={20} style={{ margin: '0 auto 6px auto', color: mode === 'TEAM' ? 'var(--neon-purple)' : 'inherit' }} />
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Team Mode</div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>
                {isTeamBattle ? 'Team battle enabled' : 'Form a squad'}
              </div>
            </button>
          </div>
        </div>

        {mode === 'TEAM' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              TEAM NAME <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cyber Knights"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--glass-border)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleRegister}
          isLoading={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
          }}
        >
          <ShieldCheck size={16} /> Register & Enter Battle →
        </Button>
      </Card>
    </div>
  );
}
