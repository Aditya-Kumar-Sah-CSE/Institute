'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { normalizeRole } from '@/lib/role-utils';

export default function PwaStartPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function launch() {
      try {
        const supabase = createClient();
        
        // Instant check from client-side stored session (memory / local cookie)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !session.user) {
          if (isMounted) router.replace('/login?from=pwa');
          return;
        }

        // Fast path: role from session metadata (0ms latency)
        const metadataRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
        if (metadataRole) {
          const role = normalizeRole(metadataRole);
          const target = (role === 'admin' || role === 'developer' || role === 'super_admin' || role === 'superadmin')
            ? '/admin'
            : (role === 'instructor')
            ? '/instructor'
            : '/dashboard';
          if (isMounted) router.replace(target);
          return;
        }

        // Parallel fetch profile with fast 800ms race fallback to /dashboard
        const profileFetch = supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const timeoutFallback = new Promise<{ data: any }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 800)
        );

        const { data: profile } = await Promise.race([profileFetch, timeoutFallback]);
        const userRole = normalizeRole(profile?.role || metadataRole);

        if (isMounted) {
          if (userRole === 'instructor') {
            router.replace('/instructor');
          } else if (userRole === 'admin' || userRole === 'developer' || userRole === 'super_admin' || userRole === 'superadmin') {
            router.replace('/admin');
          } else {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        console.error('[PWA-Start] Launch resolution error:', err);
        if (isMounted) router.replace('/dashboard');
      }
    }

    launch();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: '#0b0f19',
      color: '#ffffff',
      padding: '24px',
      boxSizing: 'border-box',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 999999
    }}>
      <style>{`
        @keyframes pwaPulseGlow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0, 240, 255, 0.4)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(0, 240, 255, 0.7)); }
        }
        @keyframes pwaProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      
      <div style={{
        position: 'relative',
        width: '96px',
        height: '96px',
        marginBottom: '20px',
        animation: 'pwaPulseGlow 2s ease-in-out infinite'
      }}>
        <Image
          src="/icon-192x192.png"
          alt="Smart Learn"
          width={96}
          height={96}
          priority
          style={{
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
        />
      </div>

      <h1 style={{
        fontSize: '22px',
        fontWeight: 800,
        margin: '0 0 8px 0',
        letterSpacing: '-0.5px',
        background: 'linear-gradient(135deg, #00f0ff 0%, #7000ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center'
      }}>
        Smart Learn
      </h1>

      <p style={{
        fontSize: '13px',
        color: '#94a3b8',
        margin: '0 0 24px 0',
        fontWeight: 500,
        textAlign: 'center'
      }}>
        Starting your workspace...
      </p>

      {/* Ultra-smooth indeterminate loader bar */}
      <div style={{
        width: '160px',
        height: '3px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '999px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #00f0ff, #7000ff, transparent)',
          borderRadius: '999px',
          animation: 'pwaProgress 1.2s ease-in-out infinite'
        }} />
      </div>
    </div>
  );
}
