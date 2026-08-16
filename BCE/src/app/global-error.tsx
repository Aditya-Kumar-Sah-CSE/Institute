'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Critical Global Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: 0,
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '32px',
          gap: '16px',
          backdropFilter: 'blur(12px)'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#06b6d4' }}>
            System Reload Required
          </h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
            A critical error occurred while initializing the layout workspace. Please click reload to reset active sessions.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
              Dashboard
            </Button>
            <Button variant="primary" onClick={() => reset()}>
              Reload Workspace
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
