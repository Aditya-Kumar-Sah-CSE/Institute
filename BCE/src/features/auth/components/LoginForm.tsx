'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { signIn, resendVerificationEmail } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
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
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    setResendMessage(null);

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

  async function handleResendFromLogin() {
    if (!formData.email) {
      setResendMessage({ type: 'error', text: 'Please enter your email address above first.' });
      return;
    }
    setIsResending(true);
    setResendMessage(null);

    const result = await resendVerificationEmail(formData.email);
    if (result.error) {
      setResendMessage({ type: 'error', text: result.error });
      setIsResending(false);
    } else {
      setResendMessage({ type: 'success', text: result.message || 'Verification email sent.' });
      setIsResending(false);
      setResendCooldown(60);
    }
  }

  const isUnverifiedError = error && (
    error.toLowerCase().includes('email not confirmed') || 
    error.toLowerCase().includes('confirmation link') || 
    error.toLowerCase().includes('verify')
  );

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
          
          {error && (
            isUnverifiedError ? (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: '#facc15', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Email not verified</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>
                  Please verify your email before signing in. Check your inbox or click below to resend.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    isLoading={isResending}
                    disabled={resendCooldown > 0 || isResending}
                    onClick={handleResendFromLogin}
                    style={{ width: '100%' }}
                  >
                    {resendCooldown > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} className="spin" /> Resend available in {resendCooldown}s
                      </span>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                </div>
                {resendMessage && (
                  <div style={{ fontSize: 'var(--text-xs)', color: resendMessage.type === 'error' ? 'var(--neon-red)' : 'var(--neon-lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {resendMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span>{resendMessage.text}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-error">{error}</div>
            )
          )}

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

