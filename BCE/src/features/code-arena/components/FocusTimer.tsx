'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

export default function FocusTimer() {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isActive && mounted) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mounted]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(0);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // SSR Safe: Return a matching static skeleton during server rendering and hydration
  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '12px',
          height: '28px',
          boxSizing: 'border-box',
          color: 'var(--text-muted)',
          opacity: 0.5
        }}
      >
        <Timer size={13} />
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>00:00</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '4px 14px',
        fontSize: '12px',
        height: '28px',
        boxSizing: 'border-box',
        color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)',
        boxShadow: isActive ? '0 0 10px rgba(6, 182, 212, 0.08)' : 'none',
        transition: 'all 0.3s ease',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Timer 
          size={13} 
          style={{ 
            animation: isActive ? 'spin 6s linear infinite' : 'none',
            color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)'
          }} 
        />
        <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>
          {formatTime(time)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '8px', marginLeft: '2px' }}>
        <button
          onClick={toggleTimer}
          style={{
            background: 'none',
            border: 'none',
            color: isActive ? 'var(--neon-gold)' : 'var(--neon-cyan)',
            cursor: 'pointer',
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            transition: 'transform 0.2s',
          }}
          title={isActive ? 'Pause Timer' : 'Start Timer'}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isActive ? <Pause size={11} /> : <Play size={11} />}
        </button>

        <button
          onClick={resetTimer}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--neon-pink)',
            cursor: 'pointer',
            padding: 0,
            display: 'grid',
            placeItems: 'center',
            transition: 'transform 0.2s',
          }}
          title="Reset Timer"
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <RotateCcw size={11} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  );
}
