import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getGoogleDriveRedirectUri } from '@/features/profile/actions/google-drive';
import crypto from 'crypto';

const REQUIRED_SUBFOLDERS = [
  'Courses',
  'Assignments',
  'Submissions',
  'Certificates',
  'Battle Certificates',
  'Doubts',
  'Stories',
  'Chat',
  'Notes',
  'Notices',
  'Forum',
  'Avatars',
  'Other',
];

/**
 * Creates or reuses a Google Drive folder by name and parent ID.
 */
async function getOrCreateDriveFolder(accessToken: string, folderName: string, parentId?: string): Promise<string> {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  // 1. Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  } else {
    throw new Error(`Drive folder search failed (${searchRes.status}): ${(await searchRes.text()).slice(0, 500)}`);
  }

  // 2. Create folder if not found
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Drive folder ${folderName}: ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  const cookieState = request.cookies.get('gdrive_oauth_state')?.value;

  if (oauthError || !code || !state || state !== cookieState) {
    console.error('[google-drive/callback] authorization rejected or state mismatch', { traceId, oauthError: oauthError || null, hasCode: Boolean(code), hasState: Boolean(state), hasCookieState: Boolean(cookieState) });
    return NextResponse.redirect(new URL('/profile?drive_error=invalid_state', request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const rawClientId = process.env.GOOGLE_CLIENT_ID || '';
  const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
  const clientSecret = rawClientSecret.trim().replace(/^["']|["']$/g, '');

  if (!clientId || !clientSecret || clientId.includes('YOUR_') || clientId.toLowerCase() === 'placeholder') {
    console.error('Google Drive OAuth is not configured: missing or invalid GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
    return NextResponse.redirect(new URL('/profile?drive_error=unavailable', request.url));
  }

  let redirectUri: string;
  try {
    redirectUri = await getGoogleDriveRedirectUri(request.url);
  } catch (error) {
    console.error('[google-drive/callback] invalid redirect URI configuration', { traceId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(new URL('/profile?drive_error=unavailable', request.url));
  }

  try {
    console.info('[google-drive/callback] starting token exchange', { traceId, userId: user.id, redirectUri });
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[google-drive/callback] token exchange failed', { traceId, status: tokenRes.status, response: errText.slice(0, 1000), redirectUri });
      return NextResponse.redirect(new URL('/profile?drive_error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    if (!accessToken || typeof accessToken !== 'string') throw new Error('Google token response did not include an access token');

    // 2. Fetch user Google account email
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let googleEmail = user.email || 'connected@gmail.com';
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json();
      if (userinfo.email) googleEmail = userinfo.email;
    }

    // 3. Automatically create/reuse root folder "Smart Learn/"
    console.info('[google-drive/callback] provisioning Drive folders', { traceId, userId: user.id });
    const rootFolderId = await getOrCreateDriveFolder(accessToken, 'Smart Learn');

    // 4. Automatically create/reuse required subfolders
    const subfolders: Record<string, string> = {};
    for (const subName of REQUIRED_SUBFOLDERS) {
      const subId = await getOrCreateDriveFolder(accessToken, subName, rootFolderId);
      subfolders[subName] = subId;
    }

    // 5. Store tokens securely in database via admin client
    const adminSb = await createAdminClient();

    // Check if refresh_token was provided (Google provides it on first consent)
    const updatePayload: any = {
      user_id: user.id,
      access_token: accessToken,
      expires_at: expiresAt,
      email: googleEmail,
      root_folder_id: rootFolderId,
      subfolders,
      updated_at: new Date().toISOString(),
    };

    if (refreshToken) {
      updatePayload.refresh_token = refreshToken;
    }

    const { error: upsertErr } = await adminSb
      .from('user_google_drive_tokens')
      .upsert(updatePayload, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('[google-drive/callback] failed to store Drive connection', { traceId, code: upsertErr.code, message: upsertErr.message });
      return NextResponse.redirect(new URL('/profile?drive_error=db_save_failed', request.url));
    }

    // Redirect to profile page with success message
    const response = NextResponse.redirect(new URL('/profile?drive_connected=true', request.url));
    response.cookies.delete('gdrive_oauth_state');
    console.info('[google-drive/callback] Drive connected', { traceId, userId: user.id, googleEmail });
    return response;
  } catch (err: any) {
    console.error('[google-drive/callback] unexpected callback exception', { traceId, name: err?.name, message: err?.message, stack: err?.stack, userId: user.id, redirectUri });
    return NextResponse.redirect(new URL('/profile?drive_error=callback_exception', request.url));
  }
}
