'use client';

import React, { useTransition } from 'react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { signOut } from '@/features/auth/actions/auth';
import { LogOut, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-xl)',
      textAlign: 'center',
      background: 'var(--bg-main)'
    }}>
      <div className="glass-card" style={{ padding: 'var(--space-2xl)', maxWidth: '500px', width: '100%' }}>
        <div style={{ fontSize: '6rem', marginBottom: 'var(--space-md)', textShadow: '0 0 20px rgba(0, 242, 254, 0.5)', fontWeight: 800 }}>
          404
        </div>
        <h1 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: '1.6' }}>
          We couldn't find the page you're looking for. The student profile or page might have been removed, or the link is incorrect.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center' }}>
          <Button onClick={() => router.back()} variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Go Back
          </Button>
          <Button 
            onClick={handleLogout} 
            disabled={isPending}
            variant="danger" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <LogOut size={16} /> {isPending ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
}
