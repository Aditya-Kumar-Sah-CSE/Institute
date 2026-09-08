import { createClient } from '@/lib/supabase/client';

/**
 * Validates a list of files based on maximum size and allowed MIME types.
 */
export function validateFiles(
  files: File[], 
  options: { maxSizeMB?: number; allowedTypes?: string[]; maxFiles?: number } = {}
) {
  const { maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'], maxFiles = 10 } = options;
  
  if (files.length > maxFiles) {
    return { valid: false, error: `You can only upload a maximum of ${maxFiles} files at a time.` };
  }

  for (const file of files) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `File ${file.name} exceeds the ${maxSizeMB}MB limit.` };
    }
    
    // Check if the file's mime type represents an allowed type loosely if not strict match
    const isAllowed = allowedTypes.some(type => {
       if (type.endsWith('/*')) {
         const typePrefix = type.split('/')[0];
         return file.type.startsWith(typePrefix + '/');
       }
       return file.type === type;
    });

    if (!isAllowed) {
      return { valid: false, error: `File type ${file.type || 'unknown'} for ${file.name} is not allowed.` };
    }
  }

  return { valid: true };
}

/**
 * Parses attachment string from database which might be a single URL or a JSON array of URLs.
 */
export function parseAttachmentUrls(data: string | null | undefined): string[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter(url => typeof url === 'string');
    }
    return [data];
  } catch (e) {
    // If it's not valid JSON, treat it as a single legacy URL string
    return [data];
  }
}

/**
 * Serializes an array of URLs into a JSON string format for database storage. 
 * If the array is empty, returns null. If it's a single URL, we still return a JSON array for consistency.
 */
export function serializeAttachmentUrls(urls: string[]): string | null {
  if (!urls || urls.length === 0) return null;
  return JSON.stringify(urls);
}

/**
 * Category mapping: Maps Supabase bucket names and common categories to
 * Google Drive subfolder keys in the Smart Learn hierarchy.
 */
export const BUCKET_TO_DRIVE_CATEGORY: Record<string, string> = {
  'avatars': 'Profile Image',
  'story_media': 'Activity History',
  'lesson_notes': 'Course Materials',
  'attachments': 'Other',
  'branding': 'Other',
  // Direct category mappings
  'Courses': 'Course Materials',
  'Assignments': 'Assignments',
  'Submissions': 'Submissions',
  'Notes': 'Notes',
  'Chat': 'Chat',
  'Doubts': 'Doubts',
  'Forum': 'Forum',
  'Notices': 'Notices',
  'Profile': 'Profile Image',
  'AI': 'AI Documents',
  'Certificates': 'Certificates',
  'Battle Certificates': 'Battle Certificates',
  'Projects': 'Projects',
  'Badges': 'Badges',
};

/**
 * Generic upload helper for Supabase.
 * Works on both client and server by taking the Supabase instance as an argument.
 * Designed to upload multiple files concurrently.
 */
async function ensureBucketExists(supabase: any, bucketName: string) {
  if (!supabase?.storage) return;

  try {
    const storageApi = supabase.storage as any;
    if (typeof storageApi.getBucket === 'function') {
      const { error } = await storageApi.getBucket(bucketName);
      if (!error) return;
    }

    if (typeof storageApi.createBucket === 'function') {
      await storageApi.createBucket(bucketName, { public: true });
    }
  } catch (e: any) {
    console.warn(`Could not ensure storage bucket ${bucketName}:`, e?.message || e);
  }
}

export async function uploadFiles({
  files,
  supabase,
  bucketName,
  pathPrefix = '',
  ensureBucket = false
}: {
  files: File[];
  supabase: any;
  bucketName: string;
  pathPrefix?: string;
  ensureBucket?: boolean;
}): Promise<{ urls: string[], errors: string[] }> {
  const uploadedUrls: string[] = [];
  const errors: string[] = [];

  if (ensureBucket) {
    await ensureBucketExists(supabase, bucketName);
  }

  const uploadPromises = files.map(async (file) => {
    try {
      if (!file || file.size === 0) return null;
      const fileExt = file.name.split('.').pop();
      const uniqueFilename = `${crypto.randomUUID()}-${Date.now()}.${fileExt}`;
      const filePath = pathPrefix ? `${pathPrefix}/${uniqueFilename}` : uniqueFilename;

      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: false });

      if (uploadResult.error && ensureBucket && /bucket not found|not found/i.test(uploadResult.error.message)) {
        await ensureBucketExists(supabase, bucketName);
        uploadResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: false });
      }

      if (uploadResult.error) {
        errors.push(`Upload failed for ${file.name}: ${uploadResult.error.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return { publicUrl, filePath };
    } catch (e: any) {
      errors.push(`Unexpected error uploading ${file.name}: ${e.message}`);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  
  for (const result of results) {
    if (result) uploadedUrls.push(result.publicUrl);
  }

  return { urls: uploadedUrls, errors };
}

/**
 * Generic delete helper for rollback in case of partial fails or explicit deletion.
 */
export async function deleteUploadedFiles({
  urls,
  supabase,
  bucketName
}: {
  urls: string[];
  supabase: any;
  bucketName: string;
}): Promise<{ success: boolean }> {
  if (!urls || urls.length === 0) return { success: true };
  
  try {
    const pathsToDelete = urls.map(url => {
      const parts = url.split(`/${bucketName}/`);
      return parts.length > 1 ? parts[1] : null;
    }).filter(Boolean) as string[];

    if (pathsToDelete.length > 0) {
      await supabase.storage.from(bucketName).remove(pathsToDelete);
    }
    return { success: true };
  } catch (e) {
    console.error('Failed to rollback files:', e);
    return { success: false };
  }
}



