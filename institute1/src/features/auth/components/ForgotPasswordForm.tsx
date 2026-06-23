'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { resetPasswordRequest } from '@/features/auth/actions/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import './AuthForms.css';

export default function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError('');
    setSuccess('');
    const result = await resetPasswordRequest(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess('Check your email for the password reset link.');
    }
    setIsLoading(false);
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
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          ← Back to Login
        </Link>
        <div className="auth-header">
          <span className="auth-logo">🔐</span>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive a password reset link</p>
        </div>

        <form action={handleSubmit} className="auth-form">
          {success && <div className="auth-success" style={{ color: 'var(--neon-lime)', background: 'rgba(57, 255, 20, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neon-lime)' }}>{success}</div>}
          {error && <div className="auth-error">{error}</div>}

          {!success && (
            <>
              <Input
                name="email"
                type="email"
                label="Email"
                placeholder="your@email.com"
                icon="📧"
                required
              />

              <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                Send Reset Link
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
