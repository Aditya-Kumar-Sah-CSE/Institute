'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { User, Mail, Lock } from 'lucide-react';
import './AuthForms.css';

interface SignupFormProps {
  companyName?: string;
  logoUrl?: string;
  tenantId?: string;
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

export default function SignupForm({ companyName, logoUrl, tenantId, baseUrl }: SignupFormProps) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (urlError) {
      setError(urlError);
    }
  }, [urlError]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(`${baseUrl || ''}/dashboard`);
        router.refresh();
      }
    });
  }, [router, supabase.auth, baseUrl]);

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
    if (baseUrl) {
      form.append('baseUrl', baseUrl);
    }

    const result = await signUp(form);
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
          <h1 className="auth-title">{companyName || 'Smart Hybrid Learning'}</h1>
          <p className="auth-subtitle">Start your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <input type="hidden" name="institution_id" value={tenantId || ''} />

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
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link href={`${baseUrl || ''}/login`} className="auth-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

