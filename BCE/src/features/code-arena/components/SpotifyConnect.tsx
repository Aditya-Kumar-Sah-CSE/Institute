'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Music, ExternalLink, RefreshCw, LogOut } from 'lucide-react';

export default function SpotifyConnect() {
  const [mounted, setMounted] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PKCE Helper Functions
  function dec2hex(dec: number) {
    return dec.toString(16).padStart(2, '0');
  }

  function generateRandomString(len = 64) {
    const arr = new Uint8Array(len / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
  }

  function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
  }

  function base64urlencode(a: ArrayBuffer): string {
    let str = '';
    const bytes = new Uint8Array(a);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async function generateChallenge(verifier: string): Promise<string> {
    const hashed = await sha256(verifier);
    return base64urlencode(hashed);
  }

  // Token refreshing logic
  const refreshSpotifyToken = async (refreshToken: string) => {
    try {
      const res = await fetch('/api/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refresh token');
      }
      localStorage.setItem('bce:spotify-token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('bce:spotify-refresh-token', data.refresh_token);
      }
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem('bce:spotify-token-expires', String(expiresAt));
      return data.access_token;
    } catch (err) {
      console.error('Error refreshing Spotify token:', err);
      handleDisconnect();
      return null;
    }
  };

  // Fetch Spotify user profile
  const fetchSpotifyUser = async (token: string, retryOnExpired = true) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 && retryOnExpired) {
        // Token might have expired, try refresh
        const refreshToken = localStorage.getItem('bce:spotify-refresh-token');
        if (refreshToken) {
          const newToken = await refreshSpotifyToken(refreshToken);
          if (newToken) {
            return fetchSpotifyUser(newToken, false);
          }
        }
        throw new Error('Session expired');
      }

      if (res.status === 429) {
        throw new Error('Spotify API rate limited (429). Please try again later.');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch Spotify profile');
      }

      setDisplayName(data.display_name || data.id);
      setAccessToken(token);
    } catch (err: any) {
      console.error('Error fetching Spotify details:', err);
      setError(err.message || 'API Error');
      // If it is session expired or unauthorized, clean credentials
      if (err.message === 'Session expired') {
        handleDisconnect();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    const token = localStorage.getItem('bce:spotify-token');
    const expiresStr = localStorage.getItem('bce:spotify-token-expires');
    const expiresAt = expiresStr ? parseInt(expiresStr, 10) : 0;

    if (token) {
      if (Date.now() >= expiresAt - 30000) { // If expired or expiring in 30 seconds
        const refreshToken = localStorage.getItem('bce:spotify-refresh-token');
        if (refreshToken) {
          refreshSpotifyToken(refreshToken).then((newToken) => {
            if (newToken) fetchSpotifyUser(newToken);
          });
        } else {
          handleDisconnect();
        }
      } else {
        fetchSpotifyUser(token);
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      const verifier = generateRandomString(64);
      const challenge = await generateChallenge(verifier);
      const state = generateRandomString(16);

      localStorage.setItem('bce:spotify-verifier', verifier);
      localStorage.setItem('bce:spotify-state', state);
      localStorage.setItem('bce:spotify-return-url', window.location.pathname);

      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '8c8a14b304c2438fb654b0c793132644';
      const redirectUri = window.location.origin + '/code-arena/spotify-callback';
      const scope = 'user-read-private';

      const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge_method=S256&code_challenge=${challenge}&state=${state}&scope=${encodeURIComponent(scope)}&show_dialog=true`;

      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Spotify connection error init:', err);
      setError('OAuth initialization failed');
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('bce:spotify-token');
    localStorage.removeItem('bce:spotify-refresh-token');
    localStorage.removeItem('bce:spotify-token-expires');
    setAccessToken(null);
    setDisplayName(null);
    setError(null);
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
          opacity: 0.5
        }}
      >
        <Music size={13} />
        <span>Spotify</span>
      </div>
    );
  }

  // Connected state
  if (accessToken && displayName) {
    return (
      <div
        className="spotify-connected-badge"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(29, 185, 84, 0.08)',
          border: '1px solid rgba(29, 185, 84, 0.25)',
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: '12px',
          height: '28px',
          boxSizing: 'border-box',
          color: '#1DB954',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
          <Music size={13} style={{ color: '#1DB954' }} />
          <span style={{ fontWeight: 600 }}>
            🎵 Spotify Connected · <strong style={{ color: '#fff' }}>{displayName}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(29, 185, 84, 0.25)', paddingLeft: '8px', marginLeft: '2px' }}>
          <a
            href="https://open.spotify.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1DB954',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '11px',
              fontWeight: 700,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title="Open Web Player"
          >
            Open Spotify <ExternalLink size={11} />
          </a>

          <button
            onClick={handleDisconnect}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'grid',
              placeItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-pink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Disconnect Spotify Account"
          >
            <LogOut size={11} />
          </button>
        </div>
      </div>
    );
  }

  // Disconnected/Error/Loading state
  return (
    <button
      onClick={handleConnect}
      disabled={loading}
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
      title={error ? `Spotify error: ${error}. Click to retry.` : 'Connect Spotify Profile'}
    >
      {loading ? (
        <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite', color: '#1DB954' }} />
      ) : (
        <Music size={13} style={{ color: '#1DB954' }} />
      )}
      <span style={{ fontWeight: 600 }}>
        {loading ? 'Connecting...' : '🎵 Connect Spotify'}
      </span>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` }} />
    </button>
  );
}
