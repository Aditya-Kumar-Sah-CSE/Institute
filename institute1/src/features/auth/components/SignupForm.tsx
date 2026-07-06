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

interface SignupFormProps {
  companyName?: string;
  logoUrl?: string;
}

export default function SignupForm({ companyName, logoUrl }: SignupFormProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            <Image src={logoUrl || '/icon-192x192.png'} alt="Logo" width={48} height={48} style={{ objectFit: 'contain' }} unoptimized={true} priority />
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
