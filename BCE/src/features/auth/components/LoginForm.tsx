'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, getLoginConfig } from '@/features/auth/actions/auth';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import './AuthForms.css';

// React Error Boundary to handle ChunkLoadError and dynamic import failures gracefully
class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
    
    // Auto-recover from chunk load errors (webpack ChunkLoadError)
    if (typeof window !== 'undefined') {
      const isChunkError = 
        error?.name === 'ChunkLoadError' || 
        error?.message?.includes('Loading chunk') || 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Failed to fetch');
        
      if (isChunkError) {
        const lastRetry = sessionStorage.getItem('chunk_retry');
        const now = Date.now();
        if (!lastRetry || now - parseInt(lastRetry, 10) > 10000) {
          sessionStorage.setItem('chunk_retry', now.toString());
          console.log('Chunk load failure detected. Performing a full reload to fetch fresh chunks...');
          window.location.reload();
        }
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <h2 className="auth-title" style={{ fontSize: 'var(--text-xl)', color: 'var(--neon-red)' }}>
              Application Error
            </h2>
            <p className="auth-subtitle" style={{ margin: 'var(--space-md) 0' }}>
              Something went wrong while loading the login interface. This might be due to a new update.
            </p>
            <Button onClick={this.handleRetry} size="md">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface LoginFormProps {
  companyName?: string;
  logoUrl?: string;
  tenantId?: string;
}

function LoginForm({ companyName, logoUrl, tenantId }: LoginFormProps) {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({ email: '', password: '' });

  // Internal states for background config resolution
  const [companyNameState, setCompanyName] = useState(companyName || '');
  const [logoUrlState, setLogoUrl] = useState(logoUrl || '');
  const [tenantIdState, setTenantId] = useState(tenantId || '');
  const [isInitializing, setIsInitializing] = useState(!companyName);
  const [initError, setInitError] = useState('');

  // Unmount guard — prevents state updates after the component is gone
  const isMountedRef = useRef(true);
  // 15-second deadline timer for the submit button
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Always clear the submit deadline on unmount
      if (submitTimerRef.current !== null) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
    };
  }, []);

  const loadConfig = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsInitializing(true);
    setInitError('');
    try {
      const configData = await getLoginConfig();
      if (!isMountedRef.current) return;
      setCompanyName(configData.companyName || '');
      setLogoUrl(configData.logoUrl || '');
      setTenantId(configData.tenantId || '');
    } catch (err: unknown) {
      console.error('Failed to load login config:', err);
      if (!isMountedRef.current) return;
      setInitError('Stall detected. Click to retry configuration.');
    } finally {
      if (isMountedRef.current) {
        setIsInitializing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!companyName) {
      loadConfig();
    }
  }, [companyName, loadConfig]);

  // Redirect guard — prevent double-redirect races
  const redirectingRef = useRef(false);

  useEffect(() => {
    // Use getUser() — server-validated JWT check.
    // getSession() reads stale localStorage and can fire redirects on
    // logged-out sessions, causing /login → / → /login loops.
    let cancelled = false;

    const deadline = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 5_000);
    });

    const userCheck = supabase.auth.getUser()
      .then(({ data: { user }, error }) => {
        if (error || !user) return null;
        return user;
      })
      .catch(() => null);

    Promise.race([userCheck, deadline]).then((user) => {
      if (cancelled || !user || !isMountedRef.current) return;
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      // Redirect to /dashboard (not '/') to skip the middleware / → /login hop
      router.replace('/dashboard');
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Prevent duplicate submissions
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    // ROOT CAUSE 1 FIX:
    // signIn() is a Next.js Server Action. On SUCCESS it calls redirect() which
    // throws a NEXT_REDIRECT internally — this propagates out of try/catch so
    // setIsLoading(false) is never reached after a successful redirect.
    // We add a 15-second deadline: if the component is still mounted and still
    // in the loading state by then, we reset it and show a recovery message.
    // Note: this does NOT cancel the server request — it is a UI recovery
    // mechanism only. The server-side auth continues to completion.
    if (submitTimerRef.current !== null) clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null;
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(
          'Sign-in is taking longer than expected. Please check your connection and try again.'
        );
      }
    }, 15_000);

    const form = new FormData();
    form.append('email', formData.email);
    form.append('password', formData.password);

    try {
      const result = await signIn(form);
      // If signIn returned (i.e. did NOT redirect), it means auth failed
      // and returned an error object rather than throwing NEXT_REDIRECT.
      if (submitTimerRef.current !== null) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      if (result?.error && isMountedRef.current) {
        setError(result.error);
        setIsLoading(false);
      }
      // If result has no error and no redirect occurred (edge case), reset loading
      if (!result?.error && isMountedRef.current) {
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (submitTimerRef.current !== null) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      // NEXT_REDIRECT is thrown as a special error — check if this is a genuine
      // application error or a framework redirect.
      const isNextRedirect =
        err instanceof Error &&
        (err.message === 'NEXT_REDIRECT' ||
          (err as unknown as Record<string, unknown>)?.digest === 'NEXT_REDIRECT');
      if (isNextRedirect) {
        // Legitimate redirect — the server has set the session and is navigating.
        // Leave isLoading=true so the button stays disabled while routing.
        // The 15-second timer above is the final safety net.
        return;
      }
      // Genuine error (network failure, unexpected exception, etc.)
      const message =
        err instanceof Error
          ? err.message
          : 'A network error occurred. Please try again.';
      console.error('[LoginForm] Sign-in error:', err);
      if (isMountedRef.current) {
        setError(message);
        setIsLoading(false);
      }
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setError('');
    
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (oauthError && isMountedRef.current) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
      }
    } catch (err: unknown) {
      console.error('[LoginForm] Google sign-in error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to initiate Google OAuth. Please try again.';
      if (isMountedRef.current) {
        setError(message);
        setIsGoogleLoading(false);
      }
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
            transition: 'color 0.2s ease',
            zIndex: 2
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          ← Home
        </Link>
        <div className="auth-header">
          <span className="auth-logo" style={{ overflow: 'hidden', borderRadius: '8px', position: 'relative', width: '48px', height: '48px', display: 'block', margin: '0 auto var(--space-md) auto' }}>
            <Image 
              src={logoUrlState || '/icon-192x192.png'} 
              alt="Logo" 
              width={48} 
              height={48} 
              style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
              unoptimized={true} 
              priority 
            />
            {isInitializing && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--accent-primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            )}
          </span>
          <h1 className="auth-title">{companyNameState ? `Sign in to ${companyNameState}` : 'Welcome Back'}</h1>
          <p className="auth-subtitle">
            {isInitializing ? 'Configuring secure access...' : 'Sign in to continue your learning journey'}
          </p>

          {initError && (
            <div style={{ 
              marginTop: 'var(--space-sm)', 
              fontSize: 'var(--text-xs)', 
              color: 'var(--accent-warning)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}>
              <span>{initError}</span>
              <button 
                type="button" 
                onClick={loadConfig} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 'var(--text-xs)',
                  padding: 0
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {message && !error && <div className="auth-success" style={{ color: 'var(--accent-success)', background: 'rgba(16, 185, 129, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-success)' }}>{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="your@email.com"
            icon={<Mail size={18} />}
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            id="login-email"
            disabled={isLoading}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              id="login-password"
              disabled={isLoading}
            />
            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-primary)', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={isLoading} size="lg">
            Sign In
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-md) 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
            <span style={{ padding: '0 var(--space-sm)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>OR KEEP IT CLUTTER-FREE</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
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
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)'
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LoginFormWithBoundary(props: LoginFormProps) {
  return (
    <AuthErrorBoundary>
      <LoginForm {...props} />
    </AuthErrorBoundary>
  );
}
