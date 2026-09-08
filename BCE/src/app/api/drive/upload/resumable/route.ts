import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { refreshGoogleDriveToken } from '@/features/profile/actions/google-drive';

/**
 * POST /api/drive/upload/resumable
 * 
 * Initiates or completes a Google Drive resumable upload on behalf of authenticated user.
 * 
 * Body (JSON):
 *   action: 'initiate' | 'complete'
 * 
 * For 'initiate':
 *   filename: string
 *   mimeType: string
 *   fileSize: number
 *   category: string (maps to subfolder key e.g. 'Avatars', 'Assignments', etc.)
 * 
 * For 'complete':
 *   uploadUri: string (resumable URI from initiate)
 *   chunk: base64-encoded file data
 *   offset: number (byte offset for this chunk)
 *   totalSize: number
 * 
 * Returns:
 *   For 'initiate': { uploadUri, folderId }
 *   For 'complete': { fileId, webViewLink, webContentLink }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSb = await createAdminClient();
    const { data: driveRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driveRecord) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    // Auto-refresh token if needed
    let accessToken = driveRecord.access_token;
    const expiresAt = new Date(driveRecord.expires_at).getTime();
    if (expiresAt - Date.now() < 120 * 1000) {
      const newToken = await refreshGoogleDriveToken(user.id);
      if (!newToken) {
        return NextResponse.json({ error: 'Failed to refresh Google Drive token' }, { status: 401 });
      }
      accessToken = newToken;
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'initiate') {
      const { filename, mimeType, fileSize, category } = body;
      if (!filename || !mimeType || !fileSize) {
        return NextResponse.json({ error: 'filename, mimeType, and fileSize are required' }, { status: 400 });
      }

      const subfolders = driveRecord.subfolders || {};
      const targetFolderId = subfolders[category || 'Other'] || driveRecord.root_folder_id;

      const metadata = {
        name: filename,
        mimeType,
        parents: [targetFolderId],
      };

      const initRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink,size',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': String(fileSize),
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initRes.ok) {
        const errText = await initRes.text();
        return NextResponse.json({ error: `Failed to initiate upload: ${errText}` }, { status: 502 });
      }

      const uploadUri = initRes.headers.get('Location');
      if (!uploadUri) {
        return NextResponse.json({ error: 'Google Drive did not return resumable URI' }, { status: 502 });
      }

      return NextResponse.json({ uploadUri, folderId: targetFolderId });

    } else if (action === 'complete') {
      // Single-shot upload using resumable URI
      const { uploadUri, fileData, mimeType: uploadMimeType, filename, fileSize: totalSize, category } = body;

      if (!uploadUri || !fileData) {
        return NextResponse.json({ error: 'uploadUri and fileData (base64) are required' }, { status: 400 });
      }

      const buffer = Buffer.from(fileData, 'base64');

      const uploadRes = await fetch(uploadUri, {
        method: 'PUT',
        headers: {
          'Content-Length': String(buffer.length),
          'Content-Type': uploadMimeType || 'application/octet-stream',
        },
        body: buffer,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return NextResponse.json({ error: `Upload failed: ${errText}` }, { status: 502 });
      }

      const fileResult = await uploadRes.json();

      // Save file metadata in Supabase
      const subfolders = driveRecord.subfolders || {};
      const targetFolderId = subfolders[category || 'Other'] || driveRecord.root_folder_id;

      await adminSb.from('user_drive_files').insert({
        user_id: user.id,
        google_drive_file_id: fileResult.id,
        google_drive_folder_id: targetFolderId,
        filename: filename || fileResult.name,
        mime_type: uploadMimeType || 'application/octet-stream',
        file_size: buffer.length,
        category: category || 'Other',
        web_view_link: fileResult.webViewLink || `https://drive.google.com/file/d/${fileResult.id}/view`,
        web_content_link: fileResult.webContentLink,
      });

      return NextResponse.json({
        fileId: fileResult.id,
        webViewLink: fileResult.webViewLink || `https://drive.google.com/file/d/${fileResult.id}/view`,
        webContentLink: fileResult.webContentLink,
      });

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "initiate" or "complete".' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[/api/drive/upload/resumable] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
