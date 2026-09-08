'use server';

import { uploadMultipleFilesWithFallback } from '@/lib/storage-service';

/**
 * Server-side upload helper that routes files to Google Drive (if connected and valid)
 * or gracefully falls back to Supabase Storage using the central storage service.
 * 
 * This function is designed for server actions ('use server') only.
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
  const result = await uploadMultipleFilesWithFallback({
    files,
    bucketName,
    pathPrefix,
    category,
    userId,
  });

  const hasDrive = result.providers.includes('google_drive');
  const source = hasDrive ? 'drive' : 'supabase';

  return {
    urls: result.urls,
    errors: result.errors,
    source,
  };
}

