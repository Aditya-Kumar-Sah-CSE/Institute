'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Use NextAuth v5 credentials provider
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      tenantSlug,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push(`/${tenantSlug}/dashboard`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}
      
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      
      <Button type="submit" className="w-full" isLoading={loading} style={{ backgroundColor: 'var(--tenant-primary)', border: 'none' }}>
        Sign in
      </Button>
    </form>
  );
}
