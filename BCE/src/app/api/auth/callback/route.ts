import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant, generateTenantBaseUrl } from '@/lib/tenant';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any;
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';
  const redirectTo = searchParams.get('redirect_to') ?? next;

  const tenant = await getCurrentTenant();
  const baseUrl = generateTenantBaseUrl(tenant?.slug || '');

  // If there's an OAuth error parameter, redirect to login with error
  if (errorParam) {
    const errorMsg = errorDesc || errorParam;
    return NextResponse.redirect(`${origin}${baseUrl || ''}/login?error=${encodeURIComponent(errorMsg)}`);
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
      return NextResponse.redirect(`${origin}${baseUrl || ''}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}${baseUrl || ''}/login?error=Could not authenticate user. Please try requesting a new link.`);
}
