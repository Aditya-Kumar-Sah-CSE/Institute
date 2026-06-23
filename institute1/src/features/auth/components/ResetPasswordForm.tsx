'use client';

import React, { useState } from 'react';
import { updatePassword } from '@/features/auth/actions/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import './AuthForms.css';

export default function ResetPasswordForm() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          <span className="auth-logo">🔑</span>
          <h1 className="auth-title">Set New Password</h1>
          <p className="auth-subtitle">Enter your new password below</p>
        </div>

        <form action={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="password"
            type="password"
            label="New Password"
            placeholder="••••••••"
            icon="🔒"
            required
          />

          <Input
            name="confirm_password"
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
            icon="🔒"
            required
          />

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
