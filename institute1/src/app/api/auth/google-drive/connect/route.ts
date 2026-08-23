import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleDriveRedirectUri } from '@/features/profile/actions/google-drive';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Google Drive OAuth is not configured: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
    return NextResponse.redirect(new URL('/profile?drive_error=unavailable', request.url));
  }

  const redirectUri = await getGoogleDriveRedirectUri(request.url);

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

  // Set secure HTTP-only state cookie
  response.cookies.set('gdrive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
