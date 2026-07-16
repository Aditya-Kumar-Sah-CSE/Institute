'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building, User, IdCard, GraduationCap, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import './AuthForms.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface SignupFormProps {
  companyName?: string;
  logoUrl?: string;
}

export default function SignupForm({ companyName, logoUrl }: SignupFormProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    institute_id: '',
    graduation_period: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
        router.refresh();
      }
    });
  }, [router, supabase.auth]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });

    const result = await signUp(form);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
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
            <Image src={logoUrl || '/icon-192x192.png'} alt="Logo" width={48} height={48} style={{ objectFit: 'contain', width: 'auto', height: 'auto' }} unoptimized={true} priority />
          </span>
          <h1 className="auth-title">{companyName || 'Smart Hybrid Learning'}</h1>
          <p className="auth-subtitle">Start your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="name"
            type="text"
            label="Full Name"
            placeholder="Your Name"
            icon={<User size={18} />}
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            name="institute_id"
            type="text"
            label="Roll No / Reg. No (Optional)"
            placeholder="Your Roll No (e.g., 2023CS01)"
            icon={<IdCard size={18} />}
            value={formData.institute_id}
            onChange={handleChange}
          />

          <Input
            name="graduation_period"
            type="text"
            label="Graduation Year"
            placeholder="Graduation Year (e.g., 2024-2028)"
            icon={<GraduationCap size={18} />}
            value={formData.graduation_period}
            onChange={handleChange}
            required
          />

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

          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Min 6 characters"
            icon={<Lock size={18} />}
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />

          <Input
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            Create Account
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-md) 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ padding: '0 var(--space-sm)', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>OR KEEP IT CLUTTER-FREE</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <Button 
            type="button" 
            variant="ghost" 
            fullWidth 
            isLoading={isGoogleLoading} 
            size="lg"
            onClick={handleGoogleSignIn}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            <GoogleIcon />
            Sign up with Google
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
