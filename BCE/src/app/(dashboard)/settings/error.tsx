'use client';

import React, { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Settings error caught:', error);
  }, [error]);

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '24px',
      background: 'var(--bg-secondary)',
      border: '1px solid rgba(255, 68, 68, 0.3)',
      borderRadius: '16px',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(255, 68, 68, 0.15)',
        color: '#ff4444',
        marginBottom: '16px'
      }}>
        <AlertCircle size={28} />
      </div>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
        Unable to load Settings
      </h2>
      <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
        {error.message || 'An unexpected error occurred while loading settings.'}
      </p>
      <Button variant="primary" onClick={() => reset()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={16} /> Try Again
      </Button>
    </div>
  );
}
