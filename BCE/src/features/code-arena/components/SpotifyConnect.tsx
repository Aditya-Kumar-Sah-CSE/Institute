'use client';

import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

export default function SpotifyConnect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenSpotify = () => {
    if (typeof window !== 'undefined') {
      window.open('https://open.spotify.com/', '_blank', 'noopener,noreferrer');
    }
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
          opacity: 0.5,
          userSelect: 'none'
        }}
      >
        <Music size={13} />
        <span>Spotify</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleOpenSpotify}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '4px 12px',
        fontSize: '12px',
        height: '28px',
        boxSizing: 'border-box',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(29, 185, 84, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.3)';
        e.currentTarget.style.color = '#1DB954';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      title="Open Spotify Web Player"
    >
      <Music size={13} style={{ color: '#1DB954' }} />
      <span style={{ fontWeight: 600 }}>🎵 Spotify</span>
    </button>
  );
}
