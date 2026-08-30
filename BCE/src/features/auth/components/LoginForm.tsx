'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { signIn } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';
import './AuthForms.css';

interface LoginFormProps {
  companyName?: string;
  logoUrl?: string;
  baseUrl?: string;
}

function LogoAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = (name || 'S L')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '8px',
        backgroundColor: 'var(--neon-cyan)',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.42,
      }}
    >
      {initials}
    </div>
  );
}

export default function LoginForm({ companyName, logoUrl, baseUrl }: LoginFormProps) {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const urlError = searchParams.get('error');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (urlError) {
      setError(urlError);
    }
  }, [urlError]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
      if (cancelled) return;
      if (userError || !user) return;

      if (redirectingRef.current) return;

      const destination = `${baseUrl || ''}/dashboard`;

      if (pathname === destination || pathname?.startsWith(`${baseUrl || ''}/dashboard`)) return;

      redirectingRef.current = true;
      router.replace(destination);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [baseUrl, pathname, router, supabase.auth]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e?: React.FormEvent | React.KeyboardEvent) {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    const form = new FormData();
    form.append('email', formData.email);
    form.append('password', formData.password);
    if (baseUrl) {
      form.append('baseUrl', baseUrl);
    }

    const result = await signIn(form);
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
          href={baseUrl || "/"} 
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
          <span className="auth-logo" style={{ overflow: 'hidden', borderRadius: '8px', display: 'inline-block' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: 'auto', height: '48px', objectFit: 'contain' }} />
            ) : (
              <LogoAvatar name={companyName || 'Smart Learning'} />
            )}
          </span>
          <h1 className="auth-title">{companyName ? `Sign in to ${companyName}` : 'Welcome Back'}</h1>
          <p className="auth-subtitle">Sign in to continue your learning journey</p>
        </div>

        <div className="auth-form" onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}>
          {message && !error && <div className="auth-success" style={{ color: 'var(--neon-lime)', background: 'rgba(57, 255, 20, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-lime)' }}>{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={formData.password}
              onChange={handleChange}
              required
            />
            <div style={{ textAlign: 'right' }}>
              <Link href={`${baseUrl || ''}/forgot-password`} style={{ fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
          </div>

          <Button type="button" fullWidth isLoading={isLoading} size="lg" onClick={() => handleSubmit()}>
            Sign In
          </Button>
        </div>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{' '}
            <Link href={`${baseUrl || ''}/signup`} className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

