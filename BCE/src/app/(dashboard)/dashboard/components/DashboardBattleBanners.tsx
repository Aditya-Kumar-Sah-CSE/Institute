'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Swords, Flame, ArrowRight, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Battle {
  id: string;
  title: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  join_code: string;
}

interface DashboardBattleBannersProps {
  battles: Battle[];
}

function CountdownTimer({ targetDate, label }: { targetDate: string; label: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Now!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${String(seconds).padStart(2, '0')}s`);

      setTimeLeft(parts.join(' '));
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(239, 68, 68, 0.12)',
        color: '#f87171',
        padding: '2px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'monospace',
        letterSpacing: '0.5px',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        whiteSpace: 'nowrap',
      }}
    >
      <Clock size={12} /> {label}: {timeLeft}
    </span>
  );
}

export default function DashboardBattleBanners({ battles }: DashboardBattleBannersProps) {
  if (!battles || battles.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
      {battles.map((battle) => {
        const isLive = battle.status === 'LIVE';
        const isScheduled = battle.status === 'SCHEDULED';
        const isLobby = battle.status === 'LOBBY';

        let badgeText = 'Lobby Open';
        let badgeBg = 'rgba(6, 182, 212, 0.12)';
        let badgeColor = 'var(--neon-cyan)';
        let borderShadow = '0 0 15px rgba(6, 182, 212, 0.15)';
        let borderColor = 'rgba(6, 182, 212, 0.4)';

        if (isLive) {
          badgeText = 'LIVE NOW ⚔️';
          badgeBg = 'rgba(239, 68, 68, 0.15)';
          badgeColor = '#f87171';
          borderShadow = '0 0 20px rgba(239, 68, 68, 0.25)';
          borderColor = 'rgba(239, 68, 68, 0.6)';
        } else if (isScheduled) {
          badgeText = 'Scheduled';
          badgeBg = 'rgba(234, 179, 8, 0.12)';
          badgeColor = '#eab308';
          borderShadow = '0 0 15px rgba(234, 179, 8, 0.15)';
          borderColor = 'rgba(234, 179, 8, 0.4)';
        }

        const scheduledTimeStr = battle.start_time
          ? new Date(battle.start_time).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '';

        return (
          <div
            key={battle.id}
            style={{
              background: 'var(--bg-elevated)',
              border: `1.5px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md) var(--space-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              boxShadow: borderShadow,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '4px',
                background: isLive
                  ? 'linear-gradient(to bottom, #ef4444, #ec4899)'
                  : isScheduled
                  ? 'linear-gradient(to bottom, #eab308, #f59e0b)'
                  : 'linear-gradient(to bottom, var(--neon-cyan), var(--neon-purple))',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, minWidth: '240px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.1)',
                  border: `1px solid ${isLive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.2)'}`,
                  color: isLive ? '#ef4444' : 'var(--neon-cyan)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {isLive ? <Flame size={22} /> : <Swords size={22} />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {battle.title}
                  </h4>
                  <span
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    {badgeText}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', alignItems: 'center' }}>
                  <span>⏱️ {battle.duration_minutes} mins</span>
                  {battle.join_code && (
                    <span>🔑 {battle.join_code}</span>
                  )}
                  {scheduledTimeStr && (
                    <span>📅 {scheduledTimeStr}</span>
                  )}
                  {/* Live countdown timers */}
                  {isLive && battle.end_time && (
                    <CountdownTimer targetDate={battle.end_time} label="Ends in" />
                  )}
                  {isScheduled && battle.start_time && (
                    <CountdownTimer targetDate={battle.start_time} label="Starts in" />
                  )}
                </div>
              </div>
            </div>

            <Link href={`/code-arena/battles/${battle.id}`} style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="sm"
                style={{
                  background: isLive
                    ? 'linear-gradient(135deg, #ef4444, #ec4899)'
                    : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isLive ? '0 0 10px rgba(239, 68, 68, 0.4)' : '0 0 10px rgba(6, 182, 212, 0.3)',
                }}
              >
                {isLive ? 'Enter Battle' : (isLobby ? 'Join Lobby' : 'View Arena')} <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
