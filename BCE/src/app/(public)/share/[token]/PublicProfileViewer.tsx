'use client';

import { useState } from 'react';
import { User, Award, Code2, Users, Star, Flame, Trophy } from 'lucide-react';
import Button from '@/components/ui/Button';
import LoginRequiredModal from '@/components/shared/LoginRequiredModal';

interface PublicProfileViewerProps {
  profile: any;
  isCodingProfile?: boolean;
  shareExpiresAt: string;
}

export default function PublicProfileViewer({ profile, isCodingProfile = false, shareExpiresAt }: PublicProfileViewerProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div style={{
      maxWidth: '540px',
      width: '100%',
      margin: '40px auto',
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid var(--glass-border)',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Top Header Card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.1)', border: '2px solid var(--neon-cyan)',
          display: 'grid', placeItems: 'center', color: 'var(--neon-cyan)',
          fontSize: '24px', fontWeight: 800
        }}>
          {profile.name?.substring(0, 1).toUpperCase() || 'U'}
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>{profile.name || 'Anonymous User'}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              {profile.role?.toUpperCase() || 'STUDENT'}
            </span>
            {profile.graduation_period && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Class of {profile.graduation_period}</span>
            )}
          </div>
        </div>
      </div>

      {/* Conditionally render coding profile stats or normal profile stats */}
      {isCodingProfile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code2 size={16} /> Coding Performance Metrics
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Trophy size={12} style={{ color: '#fbbf24' }} /> Rank
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Top 5%</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                <Star size={12} style={{ color: 'var(--neon-cyan)' }} /> Level
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Master Coder</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Flame size={12} style={{ color: '#f97316' }} /> Coding Streaks
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f97316' }}>{profile.streak_days || 0} Days Active Streak</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} /> Learning Progress stats
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--neon-cyan)', marginBottom: '4px' }}>
                {profile.streak_days || 0}
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Streak Days</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#a855f7', marginBottom: '4px' }}>
                Level 12
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Academic Level</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile actions -> trigger login */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <Button
          onClick={() => setShowLoginModal(true)}
          style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            fontWeight: 800,
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={15} /> Add Connection
        </Button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
        This temporary share view will automatically expire in 30 minutes.
      </div>

      <LoginRequiredModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
