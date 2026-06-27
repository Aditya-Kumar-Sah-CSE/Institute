'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import './AuthForms.css';

export default function SignupForm() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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

    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const result = await signUp(formData);
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
          <span className="auth-logo">🏛️</span>
          <h1 className="auth-title"> Smart Hybrid Learning</h1>
          <p className="auth-subtitle">Start your journey </p>
        </div>

        <form action={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="name"
            type="text"
            label="Full Name"
            placeholder="Your Name"
            icon="👤"
            required
          />

          <Input
            name="institute_id"
            type="text"
            label="Institute ID"
            placeholder="Your Institute ID (e.g., 2023CS01)"
            icon="🆔"
            required
          />

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon="📧"
            required
          />

          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Min 6 characters"
            icon="🔒"
            required
            minLength={6}
          />

          <Input
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            icon="🔒"
            required
          />

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            Create Account
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="auth-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
