'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { updatePassword } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AlertTriangle, KeyRound, Loader2, Lock } from 'lucide-react';
import './AuthForms.css';

export default function ResetPasswordForm() {
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setLinkError('');
        setIsCheckingSession(false);
      }
    });

    async function verifyRecoveryLink() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(rawHash);

        const urlError = searchParams.get('error') || hashParams.get('error');
        const urlErrorCode = searchParams.get('error_code') || hashParams.get('error_code');
        const urlErrorDesc = searchParams.get('error_description') || hashParams.get('error_description');

        if (urlError || urlErrorCode) {
          if (active) {
            const msg = urlErrorCode === 'otp_expired'
              ? 'This password reset link is invalid or has expired. Email link scanners or clicking a link twice can expire single-use links — please request a fresh link.'
              : urlErrorDesc || urlError || 'Invalid password reset link.';
            setLinkError(msg);
            setIsCheckingSession(false);
          }
          return;
        }

        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') || 'recovery';
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (active) {
              setLinkError('This password reset link is invalid or has expired. Please request a new reset link.');
              setIsCheckingSession(false);
            }
            return;
          }
          window.history.replaceState({}, document.title, '/reset-password');
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery',
          });
          if (verifyError) {
            if (active) {
              setLinkError('This password reset link is invalid or has expired. Please request a new reset link.');
              setIsCheckingSession(false);
            }
            return;
          }
          window.history.replaceState({}, document.title, '/reset-password');
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            if (active) {
              setLinkError('This password reset link is invalid or has expired. Please request a new reset link.');
              setIsCheckingSession(false);
            }
            return;
          }
          window.history.replaceState({}, document.title, '/reset-password');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user && active) {
          setLinkError('Your password reset session is missing or has expired. Please request a new reset link.');
        }
      } catch {
        if (active) {
          setLinkError('Unable to verify your reset link. Please request a new reset link.');
        }
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    }

    void verifyRecoveryLink();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError('');
    
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const result = await updatePassword(formData);
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

      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">
            {linkError ? (
              <AlertTriangle size={48} className="text-neon-gold" />
            ) : (
              <KeyRound size={48} className="text-neon-cyan" />
            )}
          </span>
          <h1 className="auth-title">{linkError ? 'Reset Link Expired' : 'Set New Password'}</h1>
          <p className="auth-subtitle">
            {isCheckingSession
              ? 'Verifying your password reset link...'
              : linkError
              ? 'Request a fresh reset link to continue'
              : 'Enter your new password below'}
          </p>
        </div>

        {isCheckingSession ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', color: 'var(--neon-cyan)' }}>
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : linkError ? (
          <div className="auth-form">
            <div className="auth-error">{linkError}</div>
            <Link href="/forgot-password" style={{ textDecoration: 'none', width: '100%' }}>
              <Button type="button" fullWidth size="lg">
                Request New Reset Link
              </Button>
            </Link>
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link href="/login" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form action={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <Input
              name="password"
              type="password"
              label="New Password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              required
            />

            <Input
              name="confirm_password"
              type="password"
              label="Confirm New Password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              required
            />

            <Button type="submit" fullWidth isLoading={isLoading} size="lg">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
