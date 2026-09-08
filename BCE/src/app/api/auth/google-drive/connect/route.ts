import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleDriveRedirectUri } from '@/features/profile/actions/google-drive';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Determine return URL (Settings vs Profile)
  const queryReturnTo = request.nextUrl.searchParams.get('return_to');
  const referer = request.headers.get('referer');
  let returnTo = '/settings/ai-agent';
  if (queryReturnTo && queryReturnTo.startsWith('/')) {
    returnTo = queryReturnTo;
  } else if (referer && referer.includes('/profile')) {
    returnTo = '/profile';
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const rawClientId = process.env.GOOGLE_CLIENT_ID || '';
  const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
  const clientSecret = rawClientSecret.trim().replace(/^["']|["']$/g, '');

  if (!clientId || !clientSecret || clientId.includes('YOUR_') || clientId.toLowerCase() === 'placeholder') {
    console.error('[Google OAuth Connect] OAuth not configured: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=unavailable`, request.url));
  }

  const redirectUri = await getGoogleDriveRedirectUri(request);

  // Safe development diagnostic log (Requirement 8)
  console.log('[Google OAuth Connect Diagnostic]', {
    environment: process.env.NODE_ENV || 'development',
    generatedRedirectUri: redirectUri,
    callbackRoute: '/api/auth/google-drive/callback',
    clientIdMasked: clientId ? `${clientId.slice(0, 10)}...` : 'MISSING',
    returnTo
  });

  // Generate cryptographically secure OAuth state parameter
  const state = crypto.randomBytes(32).toString('hex');

  // Google OAuth consent URL
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  const response = NextResponse.redirect(googleAuthUrl);

  // Set secure HTTP-only cookies
  response.cookies.set('gdrive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  response.cookies.set('gdrive_oauth_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
