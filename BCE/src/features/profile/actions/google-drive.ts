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
 * Environment-aware:
 * 1. Checks GOOGLE_REDIRECT_URI environment variable.
 * 2. Checks NEXT_PUBLIC_APP_URL environment variable.
 * 3. Checks VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL.
 * 4. Derives protocol and host from incoming NextRequest headers (x-forwarded-proto/x-forwarded-host).
 * 5. Defaults to http://localhost:3000/api/auth/google-drive/callback.
 */
export async function getGoogleDriveRedirectUri(requestOrUrl?: any): Promise<string> {
  // 1. Check explicit redirect URI environment variables
  const envRedirectUri = (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI
  )?.trim().replace(/^["']|["']$/g, '');

  if (envRedirectUri && (envRedirectUri.startsWith('http://') || envRedirectUri.startsWith('https://'))) {
    const canonicalUri = envRedirectUri.replace(/\/$/, '');
    console.log(`[Google OAuth Canonical URI] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
    return canonicalUri;
  }

  // 2. Check explicit site/app URL environment variables
  const appUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL
  )?.trim().replace(/^["']|["']$/g, '');

  if (appUrl && (appUrl.startsWith('http://') || appUrl.startsWith('https://'))) {
    const canonicalUri = `${appUrl.replace(/\/$/, '')}/api/auth/google-drive/callback`;
    console.log(`[Google OAuth Canonical URI from Site URL] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
    return canonicalUri;
  }

  // 3. Check Vercel production domain environment variable
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^["']|["']$/g, '');
  if (vercelProdUrl) {
    const cleanVercel = vercelProdUrl.replace(/\/$/, '');
    const protocol = cleanVercel.startsWith('http') ? '' : 'https://';
    const canonicalUri = `${protocol}${cleanVercel}/api/auth/google-drive/callback`;
    console.log(`[Google OAuth Canonical URI from Vercel Prod] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
    return canonicalUri;
  }

  // 4. Check Vercel deployment URL environment variable
  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/^["']|["']$/g, '');
  if (vercelUrl) {
    const cleanVercel = vercelUrl.replace(/\/$/, '');
    const protocol = cleanVercel.startsWith('http') ? '' : 'https://';
    const canonicalUri = `${protocol}${cleanVercel}/api/auth/google-drive/callback`;
    console.log(`[Google OAuth Canonical URI from Vercel URL] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
    return canonicalUri;
  }

  // 5. Derive from incoming request headers if available
  if (requestOrUrl) {
    try {
      if (typeof requestOrUrl !== 'string' && requestOrUrl?.headers) {
        const req = requestOrUrl;
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        if (host) {
          const cleanHost = host.split(',')[0].trim();
          const canonicalUri = `${proto}://${cleanHost}/api/auth/google-drive/callback`;
          console.log(`[Google OAuth Canonical URI from Request Host] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
          return canonicalUri;
        }
      }

      const urlStr = typeof requestOrUrl === 'string' ? requestOrUrl : requestOrUrl?.url;
      if (urlStr) {
        const parsed = new URL(urlStr);
        if (parsed.host) {
          const canonicalUri = `${parsed.protocol}//${parsed.host}/api/auth/google-drive/callback`;
          console.log(`[Google OAuth Canonical URI from Request URL] GOOGLE_OAUTH_REDIRECT_URI = ${canonicalUri}`);
          return canonicalUri;
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  const defaultUri = 'http://localhost:3000/api/auth/google-drive/callback';
  console.log(`[Google OAuth Canonical URI Default] GOOGLE_OAUTH_REDIRECT_URI = ${defaultUri}`);
  return defaultUri;
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
 * Checks if a user has an active Google Drive connection with a provisioned root folder.
 */
export async function checkDriveConnection(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const adminSb = await createAdminClient();
    const { data: record } = await adminSb
      .from('user_google_drive_tokens')
      .select('root_folder_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!record?.root_folder_id;
  } catch (e) {
    return false;
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
 * 
 * - Idempotent: skips files already present in user_drive_files by filename match.
 * - Resumable: can be called multiple times safely.
 * - Does NOT delete source files from Supabase.
 * - Reports per-file migration status.
 */
export async function migrateExistingFilesToDrive(): Promise<{
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  totalFound: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, migratedCount: 0, skippedCount: 0, failedCount: 0, totalFound: 0, error: 'Not authenticated' };

    const validData = await getValidAccessToken(user.id);
    if (!validData) return { success: false, migratedCount: 0, skippedCount: 0, failedCount: 0, totalFound: 0, error: 'Google Drive not connected' };

    const adminSb = await createAdminClient();

    // Query storage objects owned by user or containing userId
    const { data: storageObjects } = await adminSb
      .schema('storage')
      .from('objects')
      .select('*')
      .or(`owner.eq.${user.id},name.ilike.%${user.id}%`);

    if (!storageObjects || storageObjects.length === 0) {
      return { success: true, migratedCount: 0, skippedCount: 0, failedCount: 0, totalFound: 0 };
    }

    // Load already-migrated files to enable idempotency
    const { data: existingDriveFiles } = await adminSb
      .from('user_drive_files')
      .select('filename')
      .eq('user_id', user.id);

    const migratedFilenames = new Set(
      (existingDriveFiles || []).map(f => f.filename)
    );

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Category mapping: bucket_id → Drive subfolder category
    const bucketCategoryMap: Record<string, string> = {
      'avatars': 'Profile Image',
      'story_media': 'Activity History',
      'lesson_notes': 'Course Materials',
      'attachments': 'Other',
      'branding': 'Other',
    };

    for (const obj of storageObjects) {
      try {
        const filename = obj.name.split('/').pop() || obj.name;

        // Idempotency: skip if already migrated
        if (migratedFilenames.has(filename)) {
          skippedCount++;
          continue;
        }

        // Download file from Supabase Storage
        const { data: blob, error: downloadErr } = await adminSb.storage
          .from(obj.bucket_id)
          .download(obj.name);

        if (downloadErr || !blob) {
          console.warn(`[migration] Download failed for ${obj.bucket_id}/${obj.name}:`, downloadErr?.message);
          failedCount++;
          continue;
        }

        const arrayBuffer = await blob.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const mimeType = obj.metadata?.mimetype || 'application/octet-stream';

        // Determine target Drive category from bucket + path heuristics
        let category = bucketCategoryMap[obj.bucket_id] || 'Other';

        // Path-based refinement
        const pathLower = obj.name.toLowerCase();
        if (pathLower.includes('assignment') || pathLower.includes('submission')) {
          category = pathLower.includes('submission') ? 'Submissions' : 'Assignments';
        } else if (pathLower.includes('certificate') || pathLower.includes('cert')) {
          category = pathLower.includes('battle') ? 'Battle Certificates' : 'Certificates';
        } else if (pathLower.includes('chat/')) {
          category = 'Chat';
        } else if (pathLower.includes('doubt')) {
          category = 'Doubts';
        } else if (pathLower.includes('notice')) {
          category = 'Notices';
        } else if (pathLower.includes('forum')) {
          category = 'Forum';
        } else if (pathLower.includes('badge')) {
          category = 'Badges';
        } else if (pathLower.includes('project')) {
          category = 'Projects';
        }

        // Upload to Google Drive
        const uploadRes = await uploadFileToGoogleDrive({
          filename,
          mimeType,
          fileBuffer,
          category,
        });

        if (uploadRes.success) {
          migratedCount++;
          migratedFilenames.add(filename); // Prevent re-migration within same run
        } else {
          console.warn(`[migration] Upload failed for ${filename}:`, uploadRes.error);
          failedCount++;
        }
      } catch (e: any) {
        console.error(`[migration] Exception processing ${obj.name}:`, e.message);
        failedCount++;
      }
    }

    return { success: true, migratedCount, skippedCount, failedCount, totalFound: storageObjects.length };
  } catch (err: any) {
    return { success: false, migratedCount: 0, skippedCount: 0, failedCount: 0, totalFound: 0, error: err.message };
  }
}

/**
 * Full nested folder hierarchy for Smart Learn on Google Drive.
 * Designed as flat category keys mapping to nested paths for lookup.
 */
const SMART_LEARN_FOLDER_TREE: Record<string, { parent?: string; name: string }> = {
  // Top-level categories under Smart Learn/
  'Sheets':              { name: 'Sheets' },
  'Charts':              { name: 'Charts' },
  'Courses':             { name: 'Courses' },
  'Profile':             { name: 'Profile' },
  'Badges':              { name: 'Badges' },
  'Status':              { name: 'Status' },
  'Projects':            { name: 'Projects' },
  'Submissions':         { name: 'Submissions' },
  'Notes':               { name: 'Notes' },
  'AI':                  { name: 'AI' },
  'Other':               { name: 'Other' },
  'Chat':                { name: 'Chat' },
  'Doubts':              { name: 'Doubts' },
  'Forum':               { name: 'Forum' },
  'Notices':             { name: 'Notices' },
  // Nested children
  'DSA Sheets':          { parent: 'Sheets', name: 'DSA Sheets' },
  'Coding Sheets':       { parent: 'Sheets', name: 'Coding Sheets' },
  'Other Sheets':        { parent: 'Sheets', name: 'Other Sheets' },
  'Learning Charts':     { parent: 'Charts', name: 'Learning Charts' },
  'Progress Charts':     { parent: 'Charts', name: 'Progress Charts' },
  'Analytics':           { parent: 'Charts', name: 'Analytics' },
  'Course Materials':    { parent: 'Courses', name: 'Course Materials' },
  'Course Notes':        { parent: 'Courses', name: 'Notes' },
  'Assignments':         { parent: 'Courses', name: 'Assignments' },
  'Certificates':        { parent: 'Courses', name: 'Certificates' },
  'Battle Certificates': { parent: 'Courses', name: 'Battle Certificates' },
  'Profile Image':       { parent: 'Profile', name: 'Profile Image' },
  'Resume':              { parent: 'Profile', name: 'Resume' },
  'Documents':           { parent: 'Profile', name: 'Documents' },
  'Learning Status':     { parent: 'Status', name: 'Learning Status' },
  'Course Status':       { parent: 'Status', name: 'Course Status' },
  'Assignment Status':   { parent: 'Status', name: 'Assignment Status' },
  'Sheet Status':        { parent: 'Status', name: 'Sheet Status' },
  'Battle Status':       { parent: 'Status', name: 'Battle Status' },
  'Activity History':    { parent: 'Status', name: 'Activity History' },
  'AI Documents':        { parent: 'AI', name: 'Documents' },
  'Generated Content':   { parent: 'AI', name: 'Generated Content' },
  // Legacy flat aliases (backward compatibility with old subfolders dict)
  'Avatars':             { parent: 'Profile', name: 'Profile Image' },
  'Stories':             { parent: 'Status', name: 'Activity History' },
};

/**
 * Idempotently provisions the full Smart Learn folder tree on Google Drive.
 * Creates top-level categories first, then nested children.
 * Returns the complete subfolders dictionary mapping category key → Drive folder ID.
 */
export async function ensureSmartLearnFolderTree(
  accessToken: string,
  rootFolderId: string,
  existingSubfolders?: Record<string, string>
): Promise<Record<string, string>> {
  const subfolders: Record<string, string> = { ...(existingSubfolders || {}) };

  // Helper: idempotent folder search/create
  const getOrCreate = async (folderName: string, parentId: string): Promise<string> => {
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) return data.files[0].id;
    }
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create folder ${folderName}: ${errText}`);
    }
    return (await createRes.json()).id;
  };

  // Phase 1: Create top-level folders (no parent key)
  const topLevel = Object.entries(SMART_LEARN_FOLDER_TREE).filter(([, v]) => !v.parent);
  for (const [key, entry] of topLevel) {
    if (!subfolders[key]) {
      try {
        subfolders[key] = await getOrCreate(entry.name, rootFolderId);
      } catch (e) {
        console.error(`[ensureSmartLearnFolderTree] Failed top-level ${key}:`, e);
      }
    }
  }

  // Phase 2: Create nested children (have parent key)
  const nested = Object.entries(SMART_LEARN_FOLDER_TREE).filter(([, v]) => !!v.parent);
  for (const [key, entry] of nested) {
    if (!subfolders[key] && entry.parent && subfolders[entry.parent]) {
      try {
        subfolders[key] = await getOrCreate(entry.name, subfolders[entry.parent]);
      } catch (e) {
        console.error(`[ensureSmartLearnFolderTree] Failed nested ${key}:`, e);
      }
    }
  }

  return subfolders;
}

/**
 * Returns the Google Drive folder ID for a given user and category path.
 * Falls back to root folder if category not found in subfolders.
 */
export async function getUserDriveFolderId(
  userId: string,
  folderCategory: string
): Promise<string | null> {
  const adminSb = await createAdminClient();
  const { data: record } = await adminSb
    .from('user_google_drive_tokens')
    .select('root_folder_id, subfolders')
    .eq('user_id', userId)
    .single();

  if (!record) return null;

  const subfolders = record.subfolders || {};
  return subfolders[folderCategory] || record.root_folder_id;
}

/**
 * Initiates a Google Drive resumable upload session.
 * Returns the resumable upload URI for subsequent chunk uploads.
 */
export async function initiateGoogleDriveResumableUpload(params: {
  accessToken: string;
  filename: string;
  mimeType: string;
  parentFolderId: string;
  fileSize: number;
}): Promise<{ uploadUri: string } | { error: string }> {
  try {
    const metadata = {
      name: params.filename,
      mimeType: params.mimeType,
      parents: [params.parentFolderId],
    };

    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': params.mimeType,
          'X-Upload-Content-Length': String(params.fileSize),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      return { error: `Failed to initiate resumable upload: ${errText}` };
    }

    const uploadUri = initRes.headers.get('Location');
    if (!uploadUri) {
      return { error: 'Google Drive did not return a resumable upload URI' };
    }

    return { uploadUri };
  } catch (err: any) {
    return { error: err.message || 'Resumable upload initiation failed' };
  }
}

/**
 * Server action / helper to initialize Google Drive connection for a given user.
 * Idempotently searches or creates the `Smart Learn/` root folder and full nested folder hierarchy.
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

    // Helper: search or create folder on Google Drive (root-level)
    const getOrCreateRootFolder = async (folderName: string): Promise<string> => {
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
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
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create root folder ${folderName}: ${await createRes.text()}`);
      }
      return (await createRes.json()).id;
    };

    // 2. Search/Create `Smart Learn/` root folder
    const rootFolderId = existingRecord?.root_folder_id || (await getOrCreateRootFolder('Smart Learn'));

    // 3. Provision full nested folder tree
    const subfolders = await ensureSmartLearnFolderTree(
      accessToken,
      rootFolderId,
      existingRecord?.subfolders || {}
    );

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
