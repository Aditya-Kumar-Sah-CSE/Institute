'use server';

import { uploadFiles, BUCKET_TO_DRIVE_CATEGORY } from '@/lib/attachments';

/**
 * Server-side upload helper that routes files to Google Drive (if connected)
 * or falls back to Supabase Storage.
 * 
 * This function is designed for server actions ('use server') only.
 * It checks the user's Google Drive connection status and uploads accordingly.
 * 
 * @param files - File objects to upload
 * @param options - Upload options
 * @returns Array of file URLs (Drive proxy URLs or Supabase public URLs)
 */
export async function uploadFilesServerSide({
  files,
  bucketName,
  pathPrefix = '',
  category,
  userId,
}: {
  files: File[];
  bucketName: string;
  pathPrefix?: string;
  category?: string;
  userId: string;
}): Promise<{ urls: string[]; errors: string[]; source: 'drive' | 'supabase' }> {
  // Dynamic imports for server-only modules
  const { createAdminClient: createAdmin } = await import('@/lib/supabase/server');
  const { uploadFileToGoogleDrive } = await import('@/features/profile/actions/google-drive');

  const adminSb = await createAdmin();

  // Check Google Drive connection
  const { data: driveRecord } = await adminSb
    .from('user_google_drive_tokens')
    .select('root_folder_id')
    .eq('user_id', userId)
    .maybeSingle();

  const driveConnected = !!driveRecord?.root_folder_id;

  if (driveConnected) {
    // Upload to Google Drive
    const urls: string[] = [];
    const errors: string[] = [];
    const driveCategory = category || BUCKET_TO_DRIVE_CATEGORY[bucketName] || 'Other';

    for (const file of files) {
      try {
        if (!file || file.size === 0) continue;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await uploadFileToGoogleDrive({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileBuffer: buffer,
          category: driveCategory,
        });

        if (result.success && result.googleDriveFileId) {
          // Return proxy URL for secure access
          const proxyUrl = `/api/drive/files/${result.googleDriveFileId}`;
          urls.push(proxyUrl);
        } else {
          errors.push(`Drive upload failed for ${file.name}: ${result.error || 'Unknown error'}`);
        }
      } catch (e: any) {
        errors.push(`Drive upload error for ${file.name}: ${e.message}`);
      }
    }

    return { urls, errors, source: 'drive' };
  }

  // Fallback: upload to Supabase Storage
  const result = await uploadFiles({
    files,
    supabase: adminSb,
    bucketName,
    pathPrefix,
    ensureBucket: true,
  });

  return { ...result, source: 'supabase' };
}
