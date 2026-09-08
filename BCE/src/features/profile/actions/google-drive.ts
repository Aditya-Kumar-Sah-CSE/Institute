'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { formatBytes } from '@/features/profile/actions/storage';

export interface GoogleDriveStatusResult {
  configured: boolean;
  connected: boolean;
  email?: string;
  driveUsageBytes?: number;
  driveLimitBytes?: number;
  formattedDriveUsed?: string;
  formattedDriveLimit?: string;
  percentageUsed?: number;
  appFileCount?: number;
  appFileBytes?: number;
  formattedAppFileBytes?: string;
  rootFolderId?: string;
  subfolders?: Record<string, string>;
  error?: string;
}

/**
 * Helper to get the canonical Google Drive OAuth callback URL.
 * Prefers process.env.GOOGLE_REDIRECT_URI, then derives from requestUrl origin,
 * and defaults to http://localhost:3000/api/auth/google-drive/callback.
 */
export async function getGoogleDriveRedirectUri(requestUrl?: string): Promise<string> {
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (envRedirectUri && envRedirectUri.trim().length > 0) {
    let configured: URL;
    try {
      configured = new URL(envRedirectUri);
    } catch {
      throw new Error('GOOGLE_REDIRECT_URI must be an absolute URL');
    }
    if (configured.pathname !== '/api/auth/google-drive/callback') {
      throw new Error('GOOGLE_REDIRECT_URI must use /api/auth/google-drive/callback');
    }
    configured.hash = '';
    configured.search = '';
    return configured.toString().replace(/\/$/, '');
  }

  if (requestUrl) {
    try {
      const url = new URL(requestUrl);
      return `${url.origin}/api/auth/google-drive/callback`;
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  return 'http://localhost:3000/api/auth/google-drive/callback';
}

/**
 * Refreshes an expired Google Drive access token using the stored refresh_token.
 */
export async function refreshGoogleDriveToken(userId: string): Promise<string | null> {
  const adminSb = await createAdminClient();
  const { data: record } = await adminSb
    .from('user_google_drive_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

  if (!record || !record.refresh_token) {
    return null;
  }

  const rawClientId = process.env.GOOGLE_CLIENT_ID || '';
  const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
  const clientSecret = rawClientSecret.trim().replace(/^["']|["']$/g, '');

  if (!clientId || !clientSecret || clientId.includes('YOUR_') || clientId.toLowerCase() === 'placeholder') return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: record.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google Drive token:', await res.text());
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await adminSb
      .from('user_google_drive_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return newAccessToken;
  } catch (err) {
    console.error('Exception refreshing Google Drive token:', err);
    return null;
  }
}

/**
 * Get valid access token for target user, auto-refreshing if expired.
 */
async function getValidAccessToken(userId: string): Promise<{ accessToken: string; record: any } | null> {
  const adminSb = await createAdminClient();
  const { data: record } = await adminSb
    .from('user_google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!record) return null;

  const expiresAt = new Date(record.expires_at).getTime();
  const now = Date.now();

  // If token expires in less than 2 minutes, refresh it
  if (expiresAt - now < 120 * 1000) {
    const newToken = await refreshGoogleDriveToken(userId);
    if (!newToken) return null;
    record.access_token = newToken;
  }

  return { accessToken: record.access_token, record };
}

/**
 * Returns connection status, real Google Drive quota (via about.get), and app file metrics.
 */
export async function getGoogleDriveStatus(targetUserId?: string): Promise<GoogleDriveStatusResult> {
  try {
    const rawClientId = process.env.GOOGLE_CLIENT_ID || '';
    const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    const clientId = rawClientId.trim().replace(/^["']|["']$/g, '');
    const clientSecret = rawClientSecret.trim().replace(/^["']|["']$/g, '');

    if (!clientId || !clientSecret || clientId.includes('YOUR_') || clientId.toLowerCase() === 'placeholder') {
      return { configured: false, connected: false };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { configured: true, connected: false, error: 'Not authenticated' };
    }

    const userIdToQuery = targetUserId || user.id;

    if (userIdToQuery !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return { configured: true, connected: false, error: 'Unauthorized' };
      }
    }

    const validData = await getValidAccessToken(userIdToQuery);
    if (!validData) {
      return { configured: true, connected: false };
    }

    const { accessToken, record } = validData;

    // Fetch live storage quota from Google Drive API
    let driveUsageBytes = 0;
    let driveLimitBytes = 15 * 1024 * 1024 * 1024; // Default fallback 15 GB
    let percentageUsed = 0;

    try {
      const aboutRes = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        const quota = aboutData.storageQuota;
        if (quota) {
          if (quota.usage) driveUsageBytes = parseInt(quota.usage, 10) || 0;
          if (quota.limit) driveLimitBytes = parseInt(quota.limit, 10) || driveLimitBytes;
        }
      }
    } catch (e) {
      console.error('Failed to fetch Drive about quota:', e);
    }

    if (driveLimitBytes > 0) {
      percentageUsed = (driveUsageBytes / driveLimitBytes) * 100;
      if (percentageUsed > 100) percentageUsed = 100;
      percentageUsed = Math.round(percentageUsed * 10) / 10;
    }

    // Query app file metadata from DB
    const adminSb = await createAdminClient();
    const { data: appFiles } = await adminSb
      .from('user_drive_files')
      .select('file_size')
      .eq('user_id', userIdToQuery);

    const appFileCount = appFiles?.length || 0;
    let appFileBytes = 0;
    if (appFiles) {
      for (const f of appFiles) {
        if (typeof f.file_size === 'number') appFileBytes += f.file_size;
      }
    }

    return {
      configured: true,
      connected: true,
      email: record.email,
      driveUsageBytes,
      driveLimitBytes,
      formattedDriveUsed: await formatBytes(driveUsageBytes),
      formattedDriveLimit: await formatBytes(driveLimitBytes),
      percentageUsed,
      appFileCount,
      appFileBytes,
      formattedAppFileBytes: await formatBytes(appFileBytes),
      rootFolderId: record.root_folder_id,
      subfolders: record.subfolders || {},
    };
  } catch (err: any) {
    console.error('getGoogleDriveStatus Exception:', err);
    return { configured: true, connected: false, error: err.message };
  }
}

/**
 * Disconnects Google Drive by removing token records from DB.
 * NOTE: Files on user's Google Drive remain completely safe and untouched.
 */
export async function disconnectGoogleDrive(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const adminSb = await createAdminClient();
    const { error } = await adminSb
      .from('user_google_drive_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Uploads a file buffer directly to the user's Google Drive subfolder, returning file metadata.
 */
export async function uploadFileToGoogleDrive(params: {
  filename: string;
  mimeType: string;
  fileBuffer: Buffer;
  category?: string;
}): Promise<{
  success: boolean;
  googleDriveFileId?: string;
  googleDriveFolderId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const validData = await getValidAccessToken(user.id);
    if (!validData) return { success: false, error: 'Google Drive not connected' };

    const { accessToken, record } = validData;

    const category = params.category || 'Other';
    const subfolders = record.subfolders || {};
    const targetFolderId = subfolders[category] || record.root_folder_id;

    // Multipart upload to Google Drive API
    const metadata = {
      name: params.filename,
      mimeType: params.mimeType,
      parents: targetFolderId ? [targetFolderId] : [],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(
        delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${params.mimeType}\r\n\r\n`
      ),
      params.fileBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Google Drive file upload failed:', errText);
      return { success: false, error: `Drive upload failed: ${errText}` };
    }

    const fileData = await uploadRes.json();

    // Save metadata in user_drive_files table
    const adminSb = await createAdminClient();
    await adminSb.from('user_drive_files').insert({
      user_id: user.id,
      google_drive_file_id: fileData.id,
      google_drive_folder_id: targetFolderId,
      filename: params.filename,
      mime_type: params.mimeType,
      file_size: params.fileBuffer.length,
      category,
      web_view_link: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
      web_content_link: fileData.webContentLink,
    });

    return {
      success: true,
      googleDriveFileId: fileData.id,
      googleDriveFolderId: targetFolderId,
      webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
      webContentLink: fileData.webContentLink,
    };
  } catch (err: any) {
    console.error('uploadFileToGoogleDrive Exception:', err);
    return { success: false, error: err.message || 'Drive upload failed' };
  }
}

/**
 * Safely migrates existing Supabase Storage files to Google Drive for logged in user.
 */
export async function migrateExistingFilesToDrive(): Promise<{
  success: boolean;
  migratedCount: number;
  failedCount: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, migratedCount: 0, failedCount: 0, error: 'Not authenticated' };

    const validData = await getValidAccessToken(user.id);
    if (!validData) return { success: false, migratedCount: 0, failedCount: 0, error: 'Google Drive not connected' };

    const adminSb = await createAdminClient();

    // Query storage objects owned by user or containing userId
    const { data: storageObjects } = await adminSb
      .schema('storage')
      .from('objects')
      .select('*')
      .or(`owner.eq.${user.id},name.ilike.%${user.id}%`);

    if (!storageObjects || storageObjects.length === 0) {
      return { success: true, migratedCount: 0, failedCount: 0 };
    }

    let migratedCount = 0;
    let failedCount = 0;

    for (const obj of storageObjects) {
      try {
        // Download file from Supabase Storage
        const { data: blob, error: downloadErr } = await adminSb.storage
          .from(obj.bucket_id)
          .download(obj.name);

        if (downloadErr || !blob) {
          failedCount++;
          continue;
        }

        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const filename = obj.name.split('/').pop() || obj.name;
        const mimeType = obj.metadata?.mimetype || 'application/octet-stream';

        // Categorize based on bucket name
        let category = 'Other';
        if (obj.bucket_id.includes('lesson') || obj.bucket_id.includes('notes')) category = 'Notes';
        else if (obj.bucket_id.includes('assignment')) category = 'Assignments';
        else if (obj.bucket_id.includes('submission')) category = 'Submissions';
        else if (obj.bucket_id.includes('doubt')) category = 'Doubts';
        else if (obj.bucket_id.includes('story')) category = 'Stories';
        else if (obj.bucket_id.includes('avatar')) category = 'Avatars';
        else if (obj.bucket_id.includes('notice')) category = 'Notices';

        // Upload to Google Drive
        const uploadRes = await uploadFileToGoogleDrive({
          filename,
          mimeType,
          fileBuffer,
          category,
        });

        if (uploadRes.success) {
          migratedCount++;
        } else {
          failedCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    return { success: true, migratedCount, failedCount };
  } catch (err: any) {
    return { success: false, migratedCount: 0, failedCount: 0, error: err.message };
  }
}

/**
 * Server action / helper to initialize Google Drive connection for a given user.
 * Idempotently searches or creates the `Code Arena/` root folder and 12 category subfolders.
 * Persists OAuth tokens and folder IDs in `user_google_drive_tokens`.
 */
export async function initializeUserDriveStorage(
  userId: string,
  accessToken: string,
  refreshToken?: string | null,
  email?: string | null
): Promise<{ success: boolean; rootFolderId?: string; error?: string }> {
  try {
    const adminSb = await createAdminClient();

    // 1. Get existing record if present
    const { data: existingRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // If refreshToken is missing, retain existing refresh_token from DB
    const finalRefreshToken = refreshToken || existingRecord?.refresh_token;

    // Helper: search or create folder on Google Drive
    const getOrCreateDriveFolder = async (folderName: string, parentId?: string): Promise<string> => {
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      } else {
        query += ` and 'root' in parents`;
      }

      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return searchData.files[0].id;
        }
      }

      // Folder not found -> Create it
      const metadata: Record<string, any> = {
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
        throw new Error(`Failed to create folder ${folderName}: ${errText}`);
      }

      const createData = await createRes.json();
      return createData.id;
    };

    // 2. Search/Create `Smart Learn/` root folder
    const rootFolderId = existingRecord?.root_folder_id || (await getOrCreateDriveFolder('Smart Learn'));

    // 3. Search/Create subfolders
    const categories = [
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

    const subfolders: Record<string, string> = existingRecord?.subfolders || {};

    for (const cat of categories) {
      if (!subfolders[cat]) {
        try {
          const subId = await getOrCreateDriveFolder(cat, rootFolderId);
          subfolders[cat] = subId;
        } catch (subErr) {
          console.error(`Failed to create subfolder ${cat}:`, subErr);
        }
      }
    }

    // 4. Save/Update record in DB
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const upsertPayload: any = {
      user_id: userId,
      access_token: accessToken,
      expires_at: expiresAt,
      email: email || existingRecord?.email || 'connected@gmail.com',
      root_folder_id: rootFolderId,
      subfolders,
      updated_at: new Date().toISOString(),
    };

    if (finalRefreshToken) {
      upsertPayload.refresh_token = finalRefreshToken;
    }

    const { error: upsertErr } = await adminSb
      .from('user_google_drive_tokens')
      .upsert(upsertPayload, { onConflict: 'user_id' });

    if (upsertErr) {
      console.error('Failed to save user_google_drive_tokens:', upsertErr);
      return { success: false, error: upsertErr.message };
    }

    return { success: true, rootFolderId };
  } catch (err: any) {
    console.error('initializeUserDriveStorage Exception:', err);
    return { success: false, error: err.message };
  }
}
