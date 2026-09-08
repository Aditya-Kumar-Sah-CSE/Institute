import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { refreshGoogleDriveToken } from '@/features/profile/actions/google-drive';

/**
 * GET /api/drive/files/[fileId]
 * 
 * User-scoped file proxy for Google Drive files.
 * Streams the file content securely — verifies that the requesting user owns the file.
 * Auto-refreshes expired access tokens.
 * 
 * Query params:
 *   download: '1' to force download headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSb = await createAdminClient();

    // 1. Verify file ownership in user_drive_files
    const { data: fileRecord } = await adminSb
      .from('user_drive_files')
      .select('*')
      .eq('google_drive_file_id', fileId)
      .single();

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Ownership check: only the file owner can access it
    if (fileRecord.user_id !== user.id) {
      // Check if requester is admin
      const { data: profile } = await adminSb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'developer'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden: you do not own this file' }, { status: 403 });
      }
    }

    // 2. Get file owner's access token
    const ownerId = fileRecord.user_id;
    const { data: driveRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('access_token, expires_at')
      .eq('user_id', ownerId)
      .single();

    if (!driveRecord) {
      return NextResponse.json({ error: 'Google Drive not connected for file owner' }, { status: 400 });
    }

    let accessToken = driveRecord.access_token;
    const expiresAt = new Date(driveRecord.expires_at).getTime();
    if (expiresAt - Date.now() < 120 * 1000) {
      const newToken = await refreshGoogleDriveToken(ownerId);
      if (!newToken) {
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
      }
      accessToken = newToken;
    }

    // 3. Stream file from Google Drive
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      console.error(`[/api/drive/files/${fileId}] Google Drive fetch error:`, errText);
      return NextResponse.json({ error: 'Failed to fetch file from Google Drive' }, { status: 502 });
    }

    const url = new URL(request.url);
    const forceDownload = url.searchParams.get('download') === '1';

    const headers: Record<string, string> = {
      'Content-Type': fileRecord.mime_type || driveRes.headers.get('Content-Type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    };

    if (forceDownload) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileRecord.filename || 'file')}"`;
    } else {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(fileRecord.filename || 'file')}"`;
    }

    const contentLength = driveRes.headers.get('Content-Length');
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // Stream the response
    const body = driveRes.body;
    return new NextResponse(body as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('[/api/drive/files/[fileId]] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/drive/files/[fileId]
 * 
 * Deletes a file from Google Drive and removes its metadata from Supabase.
 * Only the file owner or admin can delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSb = await createAdminClient();

    const { data: fileRecord } = await adminSb
      .from('user_drive_files')
      .select('*')
      .eq('google_drive_file_id', fileId)
      .single();

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (fileRecord.user_id !== user.id) {
      const { data: profile } = await adminSb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['admin', 'developer'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get access token to delete from Drive
    const ownerId = fileRecord.user_id;
    const { data: driveRecord } = await adminSb
      .from('user_google_drive_tokens')
      .select('access_token, expires_at')
      .eq('user_id', ownerId)
      .single();

    if (driveRecord) {
      let accessToken = driveRecord.access_token;
      const expiresAt = new Date(driveRecord.expires_at).getTime();
      if (expiresAt - Date.now() < 120 * 1000) {
        const newToken = await refreshGoogleDriveToken(ownerId);
        if (newToken) accessToken = newToken;
      }

      // Delete from Google Drive (trash it)
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    // Remove metadata from Supabase
    await adminSb
      .from('user_drive_files')
      .delete()
      .eq('google_drive_file_id', fileId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[/api/drive/files/[fileId] DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
