'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-xl)',
      textAlign: 'center',
      background: 'var(--bg-main)'
    }}>
      <div className="glass-card" style={{ padding: 'var(--space-2xl)', maxWidth: '500px', width: '100%' }}>
        <div style={{ fontSize: '6rem', marginBottom: 'var(--space-md)', textShadow: '0 0 20px rgba(0, 242, 254, 0.5)' }}>
          404
        </div>
        <h1 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: '1.6' }}>
          We couldn't find the page you're looking for. The student profile or page might have been removed, or the link is incorrect.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', justifyContent: 'center' }}>
          <Button onClick={() => router.back()}>Go Back</Button>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Go to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
