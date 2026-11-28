import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant, generateTenantBaseUrl } from '@/lib/tenant';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const errorParam = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDesc = searchParams.get('error_description');

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';
  const redirectTo = searchParams.get('redirect_to') ?? next;
  const isRecoveryFlow = type === 'recovery' || redirectTo.includes('/reset-password') || errorCode === 'otp_expired';

  const tenant = await getCurrentTenant();
  const baseUrl = generateTenantBaseUrl(tenant?.slug || '');

  // If there's an OAuth/OTP error parameter, route recovery errors to /reset-password and others to /login
  if (errorParam || errorCode) {
    const errorMsg = errorDesc || errorParam || 'Link is invalid or has expired.';
    const targetPath = isRecoveryFlow ? '/reset-password' : `${baseUrl || ''}/login`;
    const codeParam = errorCode ? `&error_code=${encodeURIComponent(errorCode)}` : '';
    return NextResponse.redirect(`${origin}${targetPath}?error=${encodeURIComponent(errorMsg)}${codeParam}`);
  }

  // Prevent open redirect: only allow relative paths starting with /
  let safeRedirect = (redirectTo.startsWith('/') && !redirectTo.startsWith('//'))
    ? redirectTo
    : '/';

  // If redirect doesn't already have the base url, add it
  if (baseUrl && safeRedirect.startsWith('/') && !safeRedirect.startsWith(baseUrl)) {
    safeRedirect = `${baseUrl}${safeRedirect}`;
  }

  if (token_hash && type) {
    const supabase = await createClient();
    const { data: verifyData, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      if (verifyData.user) {
        await supabase.from('profiles').update({
          is_verified: true,
          last_login_at: new Date().toISOString()
        }).eq('id', verifyData.user.id);
      }
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  } else if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session && data.user) {
      await supabase.from('profiles').update({
        is_verified: true,
        last_login_at: new Date().toISOString()
      }).eq('id', data.user.id);

      const connectDrive = searchParams.get('connect_drive') === 'true';
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;

      if ((connectDrive || providerToken) && providerToken) {
        try {
          const { initializeUserDriveStorage } = await import('@/features/profile/actions/google-drive');
          await initializeUserDriveStorage(
            data.user.id,
            providerToken,
            providerRefreshToken,
            data.user.email
          );
        } catch (e) {
          console.error('Failed to initialize Google Drive storage on callback:', e);
          // Never block login if Drive setup has a non-fatal error
        }
      }

      return NextResponse.redirect(`${origin}${safeRedirect}`);
    } else if (error) {
      const isExpiredOrInvalid = error.message?.toLowerCase().includes('expired') || error.message?.toLowerCase().includes('invalid');
      const errorMsg = isExpiredOrInvalid
        ? isRecoveryFlow
          ? 'Password reset link has expired or is invalid. Please request a new reset link.'
          : 'Verification link has expired or is invalid. Please request a new link below.'
        : error.message;
      const targetPath = isRecoveryFlow ? '/reset-password' : `${baseUrl || ''}/verify-email`;
      return NextResponse.redirect(`${origin}${targetPath}?error=${encodeURIComponent(errorMsg)}&error_code=otp_expired`);
    }
  }

  // Fallback for missing/invalid token or OTP error
  const fallbackTarget = isRecoveryFlow ? '/reset-password' : `${baseUrl || ''}/verify-email`;
  const fallbackMsg = isRecoveryFlow
    ? 'Password reset link has expired or is invalid. Please request a new reset link.'
    : 'Verification link has expired or is invalid. Please request a new link below.';
  return NextResponse.redirect(`${origin}${fallbackTarget}?error=${encodeURIComponent(fallbackMsg)}&error_code=otp_expired`);
}
