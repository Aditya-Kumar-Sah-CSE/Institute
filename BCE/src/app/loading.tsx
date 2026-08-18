'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Global Loading / Splash Screen
 *
 * PERF: No network calls here. Uses static public assets only.
 * The logo and name are baked into the public folder —
 * fetching them from the DB during loading defeats the purpose of a splash screen.
 *
 * RECOVERY: After RECOVERY_TIMEOUT_MS the spinner is replaced with a friendly
 * recovery panel (Retry + Go to Login). This does NOT cancel the underlying
 * server suspension — it gives the user an escape hatch when the server is
 * unresponsive. The timer is cleared on unmount so normal fast loads are
 * unaffected.
 */
const RECOVERY_TIMEOUT_MS = 10_000;

export default function GlobalLoading() {
  const [showRecovery, setShowRecovery] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setShowRecovery(true);
    }, RECOVERY_TIMEOUT_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100vw', 
      background: 'radial-gradient(circle at center, #0a0a0a 0%, #000000 100%)', 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      zIndex: 9999,
      gap: '24px'
    }}>
      <div className="splash-logo-container" style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        animation: 'pulse-scale 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}>
        {/* Glow behind the logo */}
        <div style={{
          position: 'absolute',
          inset: '-20px',
          background: 'var(--neon-cyan, #00f2fe)',
          filter: 'blur(30px)',
          opacity: 0.3,
          borderRadius: '50%',
          animation: 'glow-pulse 2s ease-in-out infinite'
        }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192x192.png"
          alt="App Logo"
          width={120}
          height={120}
          style={{ objectFit: 'contain', zIndex: 2, position: 'relative', width: '100%', height: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: 700, 
          background: 'linear-gradient(to right, #00f2fe, #4facfe)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1px'
        }}>
          Smart Learn
        </h2>

        {/* Normal bounce-dot spinner — hidden once recovery kicks in */}
        {!showRecovery && (
          <div style={{ display: 'flex', gap: '6px' }} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--neon-cyan, #00f2fe)',
                animation: `bounce-dot 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.16}s`
              }} />
            ))}
          </div>
        )}

        {/* Recovery panel — shown after RECOVERY_TIMEOUT_MS */}
        {showRecovery && (
          <div role="alert" aria-live="assertive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              Still loading&hellip; The server may be temporarily unavailable.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(to right, #00f2fe, #4facfe)',
                  border: 'none',
                  borderRadius: '24px',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
                aria-label="Retry loading the application"
              >
                Retry
              </button>
              <a
                href="/login"
                style={{
                  padding: '8px 20px',
                  border: '1px solid rgba(0,242,254,0.5)',
                  borderRadius: '24px',
                  color: 'var(--neon-cyan, #00f2fe)',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                aria-label="Go to login page"
              >
                Go to Login
              </a>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
