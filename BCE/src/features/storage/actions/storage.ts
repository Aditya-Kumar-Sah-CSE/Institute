'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ALLOWED_BUCKETS = ['story_media', 'attachments', 'avatars', 'feedback_images'];

/**
 * Generates a secure, signed upload URL for a specific bucket.
 * Restricts files to {userId}/{uuid}-{timestamp}.{ext} to satisfy RLS policies.
 */
export async function getSignedUploadUrlAction(
  bucketName: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<{ signedUrl: string; token: string; path: string; fileId: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('Not authenticated');
  }

  if (!ALLOWED_BUCKETS.includes(bucketName)) {
    throw new Error(`Bucket "${bucketName}" is not allowed.`);
  }

  // Size limit validation (e.g., max 50MB for attachments, 20MB for stories)
  const maxSize = bucketName === 'story_media' ? 20 * 1024 * 1024 : 50 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new Error(`File is too large. Max allowed is ${maxSize / 1024 / 1024}MB.`);
  }

  const userId = userData.user.id;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'dat';
  const cleanName = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
  const filePath = `${userId}/${cleanName}`;

  // Call Supabase storage to generate signed upload URL
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message || 'Unknown storage error'}`);
  }

  // Create a pending media record in media_records.
  // Set expires_at to 24 hours from now. If the upload is never completed or confirmed,
  // it is automatically garbage-collected.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  const { data: mediaRecord, error: dbError } = await supabase
    .from('media_records')
    .insert({
      owner_id: userId,
      storage_key: `${bucketName}/${filePath}`,
      mime_type: contentType,
      size: fileSize,
      expires_at: expiresAt
    })
    .select('file_id')
    .single();

  if (dbError || !mediaRecord) {
    throw new Error(`Failed to log media metadata: ${dbError?.message || 'Database error'}`);
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: filePath,
    fileId: mediaRecord.file_id
  };
}

/**
 * Confirms that a media upload was completed, links it to its entity (e.g. message, story),
 * and cancels the expiration timestamp.
 */
export async function confirmMediaUploadAction(fileId: string, entityId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('media_records')
    .update({
      entity_id: entityId,
      expires_at: null // Confirming removes the expiration timestamp, marking it permanent
    })
    .eq('file_id', fileId)
    .eq('owner_id', userData.user.id);

  if (error) {
    console.error('confirmMediaUploadAction error:', error);
    return false;
  }

  return true;
}

/**
 * Generates a signed download URL for private or restricted assets.
 */
export async function getSignedDownloadUrlAction(bucketName: string, filePath: string, expiresIn = 3600): Promise<string> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('Not authenticated');
  }

  if (!ALLOWED_BUCKETS.includes(bucketName)) {
    throw new Error('Unauthorized bucket access');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed download URL: ${error?.message || 'Storage error'}`);
  }

  return data.signedUrl;
}
