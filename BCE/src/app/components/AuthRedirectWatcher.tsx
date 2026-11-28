'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects Supabase auth recovery links/errors that land on `/` with a URL
 * hash fragment (unreadable by server middleware) straight to `/reset-password`.
 */
export default function AuthRedirectWatcher() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (!hash && !search) return;

    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const queryParams = new URLSearchParams(search);

    const hasRecoveryOrError =
      hashParams.get('type') === 'recovery' ||
      hashParams.get('error_code') === 'otp_expired' ||
      (hashParams.get('error') === 'access_denied' && hashParams.has('error_description')) ||
      queryParams.get('type') === 'recovery' ||
      queryParams.get('error_code') === 'otp_expired' ||
      (queryParams.get('error') === 'access_denied' && queryParams.has('error_description'));

    if (hasRecoveryOrError) {
      router.replace(`/reset-password${search}${hash}`);
    }
  }, [router]);

  return null;
}
