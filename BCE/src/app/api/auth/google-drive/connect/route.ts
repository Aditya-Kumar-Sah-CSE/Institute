import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    return NextResponse.redirect(new URL('/profile?drive_error=not_configured', request.url));
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google-drive/callback`;

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
