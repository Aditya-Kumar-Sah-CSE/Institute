'use client';

import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

export default function SpotifyConnect() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenSpotify = () => {
    if (typeof window === 'undefined') return;

    // Check if running inside Electron / desktop context
    const isElectron = 
      window.navigator.userAgent.toLowerCase().indexOf(' electron/') > -1 ||
      (window as any).electron ||
      (window as any).ipcRenderer;

    if (isElectron) {
      // Attempt using window.electron to open URL in Brave
      const electronObj = (window as any).electron;
      if (electronObj && typeof electronObj.openUrl === 'function') {
        try {
          electronObj.openUrl('https://open.spotify.com/', 'brave');
          return;
        } catch (e) {
          console.error('Failed to open via Electron openUrl:', e);
        }
      }

      // Attempt using ipcRenderer to send custom URL open events
      const ipc = (window as any).ipcRenderer;
      if (ipc && typeof ipc.send === 'function') {
        try {
          ipc.send('open-url', { url: 'https://open.spotify.com/', browser: 'brave' });
          return;
        } catch (e) {
          console.error('Failed to send open-url via Electron ipcRenderer:', e);
        }
      }
    }

    // Default web/Vercel browser launch fallback
    window.open('https://open.spotify.com/', '_blank', 'noopener,noreferrer');
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
