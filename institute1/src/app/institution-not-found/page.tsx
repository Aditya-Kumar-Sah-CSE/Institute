'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { Bot, HelpCircle, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { signOut } from '@/features/auth/actions/auth';

export default function InstitutionNotFound() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-default)', padding: '1rem' }}>
      <Card padding="lg" style={{ maxWidth: '32rem', textAlign: 'center', borderColor: 'var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--neon-pink)' }}>
          <Bot size={64} opacity={0.8} />
        </div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Institution Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          We could not find the institution associated with this URL or subdomain. 
          The tenant may have been renamed, removed, or the custom domain is pending DNS propagation.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Button 
            onClick={handleLogout} 
            disabled={isPending}
            variant="danger" 
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={16} /> {isPending ? 'Logging out...' : 'Logout Session'}
          </Button>
          <Link href="https://smartlearn.in">
             <Button variant="secondary" style={{ width: '100%' }}>Return to Smart Learn AI</Button>
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--text-muted)' }}>
            <HelpCircle size={16} /> 
            <a href="mailto:support@smartlearn.in" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Contact Support</a>
          </div>
        </div>
      </Card>
    </div>
  );
}
