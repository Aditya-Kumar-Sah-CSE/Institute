'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('LMS Route Boundary Error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '65vh',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '16px',
      gap: '16px',
      margin: '24px 0'
    }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
        Something went wrong!
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: '1.6', margin: 0 }}>
        An unexpected error occurred in this section. The rest of BCE remains fully active. You can try reloading this module or navigating to another section.
      </p>
      {error.message && (
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: 'var(--neon-pink)',
          maxWidth: '90%',
          overflowX: 'auto',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          margin: 0
        }}>
          {error.message}
        </pre>
      )}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
        <Button variant="primary" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
