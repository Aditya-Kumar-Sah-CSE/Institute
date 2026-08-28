'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function exchangeCode() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setErrorMsg(errorParam === 'access_denied' ? 'Access denied: Spotify authorization was cancelled.' : errorParam);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setErrorMsg('Authorization code or state parameter is missing.');
        return;
      }

      // CSRF check
      const savedState = localStorage.getItem('bce:spotify-state');
      if (!savedState || state !== savedState) {
        setStatus('error');
        setErrorMsg('State validation failed (CSRF check mismatch). Please try connecting again.');
        return;
      }

      const verifier = localStorage.getItem('bce:spotify-verifier');
      if (!verifier) {
        setStatus('error');
        setErrorMsg('Spotify code verifier not found in session.');
        return;
      }

      try {
        const redirectUri = window.location.origin + '/code-arena/spotify-callback';
        const res = await fetch('/api/spotify/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            verifier,
            redirectUri,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to exchange authentication code.');
        }

        // Save tokens
        localStorage.setItem('bce:spotify-token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('bce:spotify-refresh-token', data.refresh_token);
        }
        const expiresAt = Date.now() + data.expires_in * 1000;
        localStorage.setItem('bce:spotify-token-expires', String(expiresAt));

        // Clean up verifier data
        localStorage.removeItem('bce:spotify-verifier');
        localStorage.removeItem('bce:spotify-state');

        setStatus('success');

        // Redirect back to the original page
        const returnUrl = localStorage.getItem('bce:spotify-return-url') || '/code-arena';
        localStorage.removeItem('bce:spotify-return-url');

        setTimeout(() => {
          router.push(returnUrl);
        }, 1200);

      } catch (err: any) {
        console.error('Callback token swap error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'Error occurred during Spotify token exchange.');
      }
    }

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        background: '#090d16',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {status === 'exchanging' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: '#1DB954', animation: 'spin 1.5s linear infinite' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Connecting Spotify</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
              Exchanging secure credentials with Spotify. Please do not close this window...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <CheckCircle2 size={40} style={{ color: '#1DB954' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Connection Successful!</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
              Your Spotify account is connected. Redirecting you back to your workspace...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <AlertCircle size={40} style={{ color: '#ef4444' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#ef4444' }}>Connection Failed</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              onClick={() => router.push('/code-arena')}
              style={{
                marginTop: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              Back to Code Arena
            </button>
          </div>
        )}
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
