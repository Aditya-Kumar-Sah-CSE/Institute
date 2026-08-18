'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        background: '#0a0a0a',
        gap: '20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h2>
      <p style={{ color: '#888', maxWidth: '400px', lineHeight: 1.5, margin: 0 }}>
        The page encountered an unexpected error. Please try refreshing or go back to the login page.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            background: '#00f2fe',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Try Again
        </button>
        <Link
          href="/login"
          style={{
            padding: '10px 24px',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}
        >
          Go to Login
        </Link>
      </div>
      {error?.digest && (
        <p style={{ color: '#555', fontSize: '0.75rem', margin: 0 }}>Error ID: {error.digest}</p>
      )}
    </div>
  );
}
