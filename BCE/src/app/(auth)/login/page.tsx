import LoginForm from '@/features/auth/components/LoginForm';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Smart Learning',
  description: 'Sign in to Smart Learning and continue your journey.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-container"><div className="auth-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}


