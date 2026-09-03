'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resendVerificationEmail } from '@/features/auth/actions/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import '@/features/auth/components/AuthForms.css';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get('email') || '';
  const urlError = searchParams.get('error') || '';

  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Initialize and sanitize email from URL params
  useEffect(() => {
    if (rawEmail) {
      setEmail(decodeURIComponent(rawEmail).trim());
    }
  }, [rawEmail]);

  // Handle URL error param (e.g., redirected from expired callback link)
  useEffect(() => {
    if (urlError) {
      setStatusMessage({
        type: 'error',
        text: decodeURIComponent(urlError),
      });
    }
  }, [urlError]);

  // Countdown timer handler for 60s resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    const targetEmail = email.trim();
    if (!targetEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const result = await resendVerificationEmail(targetEmail);

    if (result.error) {
      setStatusMessage({ type: 'error', text: result.error });
      setIsLoading(false);
    } else {
      setStatusMessage({
        type: 'success',
        text: result.message || 'Verification email sent. Please check your inbox or spam folder.',
      });
      setIsLoading(false);
      setCooldown(60); // Start 60-second UI cooldown
    }
  }

  return (
    <div className="auth-card" style={{ position: 'relative' }}>
      <Link 
        href="/login" 
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
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-cyan)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        <ArrowLeft size={16} /> Back to Login
      </Link>

      <div className="auth-header">
        <div 
          className="auth-logo" 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--neon-cyan)',
            margin: '0 auto var(--space-md) auto'
          }}
        >
          <Mail size={32} />
        </div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">We sent a verification link to your email address</p>
      </div>

      <div className="auth-form">
        {/* Email Address Display or Input */}
        {email ? (
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid var(--border-color)', 
              padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-md)', 
              textAlign: 'center',
              wordBreak: 'break-all'
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Verification sent to
            </div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--neon-cyan)' }}>
              {email}
            </div>
          </div>
        ) : (
          <Input
            name="email"
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            icon={<Mail size={18} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}

        {/* Status Alert Banner */}
        {statusMessage && (
          <div 
            className={statusMessage.type === 'error' ? 'auth-error' : 'auth-success'}
            style={statusMessage.type === 'success' ? {
              color: 'var(--neon-lime)',
              background: 'rgba(57, 255, 20, 0.1)',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--neon-lime)',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            } : {
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> : <AlertCircle size={16} style={{ flexShrink: 0 }} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
          Check your <strong>Inbox</strong> and <strong>Spam / Junk</strong> folder. Click the link inside the email to complete your account setup.
        </div>

        {/* Resend Action */}
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <Button
            type="button"
            fullWidth
            size="lg"
            isLoading={isLoading}
            disabled={cooldown > 0 || isLoading}
            onClick={() => handleResend()}
            style={cooldown > 0 ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
          >
            {cooldown > 0 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} className="spin" /> Resend available in {cooldown}s
              </span>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        </div>
      </div>

      <div className="auth-footer">
        <p>
          Already verified your email?{' '}
          <Link href="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="auth-container">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <Suspense fallback={
        <div className="auth-card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Loading email verification details...</div>
        </div>
      }>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
