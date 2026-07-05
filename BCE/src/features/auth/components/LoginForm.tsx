'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import './AuthForms.css';

interface LoginFormProps {
  companyName?: string;
  logoUrl?: string;
}

export default function LoginForm({ companyName, logoUrl }: LoginFormProps) {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in (handles browser back button)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
        router.refresh();
      }
    });
  }, [router, supabase.auth]);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError('');
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-card" style={{ position: 'relative' }}>
        <Link 
          href="/" 
          style={{ 
            position: 'absolute', 
            top: 'var(--space-md)', 
            left: 'var(--space-md)', 
            color: 'var(--text-secondary)', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            fontSize: 'var(--text-sm)',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          ← Home
        </Link>
        <div className="auth-header">
          <span className="auth-logo" style={{ overflow: 'hidden', borderRadius: '8px' }}>
            <Image src={logoUrl || '/icon-192x192.png'} alt="Logo" width={48} height={48} style={{ objectFit: 'contain' }} unoptimized={true} priority />
          </span>
          <h1 className="auth-title">{companyName ? `Sign in to ${companyName}` : 'Welcome Back'}</h1>
          <p className="auth-subtitle">Sign in to continue your learning journey</p>
        </div>

        <form action={handleSubmit} className="auth-form">
          {message && !error && <div className="auth-success" style={{ color: 'var(--neon-lime)', background: 'rgba(57, 255, 20, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-lime)' }}>{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon={<Mail size={18} />}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              required
            />
            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            Sign In
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
