'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BattleTimerProps {
  endTime: string | null;
  serverNow?: string | null;
  onTimerExpired?: () => void;
}

export default function BattleTimer({ endTime, serverNow, onTimerExpired }: BattleTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!endTime) {
      setRemainingMs(null);
      return;
    }

    const targetTime = new Date(endTime).getTime();
    // Compute server clock offset if serverNow provided
    const clockOffset = serverNow ? new Date(serverNow).getTime() - Date.now() : 0;

    const updateTimer = () => {
      const effectiveNow = Date.now() + clockOffset;
      const diff = targetTime - effectiveNow;

      if (diff <= 0) {
        setRemainingMs(0);
        if (onTimerExpired) onTimerExpired();
      } else {
        setRemainingMs(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, serverNow, onTimerExpired]);

  if (!endTime) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
        }}
      >
        <Clock size={14} /> Waiting to start
      </div>
    );
  }

  if (remainingMs === null) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        <Clock size={16} /> --:--
      </div>
    );
  }

  if (remainingMs <= 0) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#f87171',
          fontSize: 'var(--text-sm)',
          fontWeight: 800,
        }}
      >
        <AlertTriangle size={16} /> 00:00 (Battle Ended)
      </div>
    );
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const isCritical = minutes < 1;
  const isWarning = minutes < 5;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let bg = 'rgba(6,182,212,0.1)';
  let border = '1px solid var(--neon-cyan)';
  let textColor = 'var(--neon-cyan)';

  if (isCritical) {
    bg = 'rgba(239,68,68,0.2)';
    border = '1px solid #ef4444';
    textColor = '#f87171';
  } else if (isWarning) {
    bg = 'rgba(245,158,11,0.15)';
    border = '1px solid #f59e0b';
    textColor = '#fbbf24';
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '12px',
        background: bg,
        border: border,
        color: textColor,
        fontSize: 'var(--text-sm)',
        fontWeight: 800,
        letterSpacing: '1px',
        boxShadow: isCritical ? '0 0 10px rgba(239,68,68,0.4)' : undefined,
      }}
    >
      <Clock size={16} /> {formattedTime}
    </div>
  );
}
