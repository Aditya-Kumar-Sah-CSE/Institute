import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getGoogleDriveRedirectUri, ensureSmartLearnFolderTree } from '@/features/profile/actions/google-drive';
import crypto from 'crypto';

/**
 * Creates or reuses a Google Drive folder by name (root-level).
 */
async function getOrCreateRootDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  } else {
    throw new Error(`Drive folder search failed (${searchRes.status}): ${(await searchRes.text()).slice(0, 500)}`);
  }

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

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
  const cookieReturnTo = request.cookies.get('gdrive_oauth_return_to')?.value;
  const returnTo = cookieReturnTo && cookieReturnTo.startsWith('/') ? cookieReturnTo : '/settings/ai-agent';

  if (oauthError || !code || !state || state !== cookieState) {
    console.error('[google-drive/callback] authorization rejected or state mismatch', { traceId, oauthError: oauthError || null, hasCode: Boolean(code), hasState: Boolean(state), hasCookieState: Boolean(cookieState) });
    const errRes = NextResponse.redirect(new URL(`${returnTo}?drive_error=invalid_state`, request.url));
    errRes.cookies.delete('gdrive_oauth_state');
    errRes.cookies.delete('gdrive_oauth_return_to');
    return errRes;
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
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=unavailable`, request.url));
  }

  const redirectUri = await getGoogleDriveRedirectUri(request);

  // Safe development diagnostic log (Requirement 8)
  console.log('[Google OAuth Callback Diagnostic]', {
    environment: process.env.NODE_ENV || 'development',
    generatedRedirectUri: redirectUri,
    callbackRoute: '/api/auth/google-drive/callback',
    clientIdMasked: clientId ? `${clientId.slice(0, 10)}...` : 'MISSING',
    returnTo
  });

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
      return NextResponse.redirect(new URL(`${returnTo}?drive_error=token_exchange_failed`, request.url));
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
    const rootFolderId = await getOrCreateRootDriveFolder(accessToken, 'Smart Learn');

    // 4. Provision full nested folder hierarchy using ensureSmartLearnFolderTree
    const adminSb = await createAdminClient();
    
    // Get existing subfolders to avoid duplicates
    const { data: existingRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('subfolders')
      .eq('user_id', user.id)
      .maybeSingle();

    const subfolders = await ensureSmartLearnFolderTree(
      accessToken,
      rootFolderId,
      existingRecord?.subfolders || {}
    );

    // 5. Store tokens securely in database via admin client
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
      return NextResponse.redirect(new URL(`${returnTo}?drive_error=db_save_failed`, request.url));
    }

    // Redirect user back to target page (Settings or Profile) with success query param
    const response = NextResponse.redirect(new URL(`${returnTo}?drive_connected=true`, request.url));
    response.cookies.delete('gdrive_oauth_state');
    response.cookies.delete('gdrive_oauth_return_to');
    console.info('[google-drive/callback] Drive connected', { traceId, userId: user.id, googleEmail, returnTo });
    return response;
  } catch (err: any) {
    console.error('[google-drive/callback] unexpected callback exception', { traceId, name: err?.name, message: err?.message, stack: err?.stack, userId: user.id, redirectUri });
    return NextResponse.redirect(new URL(`${returnTo}?drive_error=callback_exception`, request.url));
  }
}

