import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code, verifier, redirectUri } = await request.json();

    if (!code || !verifier || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing code, verifier, or redirectUri in request body' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '8c8a14b304c2438fb654b0c793132644';

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error_description || data.error || 'Failed to exchange token' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Spotify token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
