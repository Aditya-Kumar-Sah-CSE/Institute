import { BUCKET_TO_DRIVE_CATEGORY, uploadFiles } from '@/lib/attachments';
import { createAdminClient } from '@/lib/supabase/server';
import { getValidAccessToken, uploadFileToGoogleDrive } from '@/features/profile/actions/google-drive';

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  provider?: 'google_drive' | 'supabase';
  driveFileId?: string;
  filePath?: string;
  error?: string;
}

export interface StorageMultipleUploadResult {
  urls: string[];
  errors: string[];
  providers: Array<'google_drive' | 'supabase'>;
}

/**
 * Executes a promise with a specified timeout limit (in milliseconds).
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Centralized upload abstraction with guaranteed Supabase fallback.
 * 
 * Rules:
 * 1. Checks if Google Drive is connected & token is valid for target userId.
 * 2. If Drive is connected & valid, attempts Drive upload with a 15-second timeout.
 * 3. On Drive success: returns provider = 'google_drive' + proxy URL.
 * 4. On Drive failure/timeout/invalid token: logs warning and immediately attempts Supabase upload.
 * 5. Returns provider = 'supabase' ONLY after Supabase upload succeeds.
 * 6. Returns error ONLY if Supabase upload also fails.
 */
export async function uploadSingleFileWithFallback({
  file,
  filename,
  mimeType,
  bucketName,
  pathPrefix = '',
  category,
  userId,
  supabaseClient,
}: {
  file: File | Buffer;
  filename: string;
  mimeType?: string;
  bucketName: string;
  pathPrefix?: string;
  category?: string;
  userId: string;
  supabaseClient?: any;
}): Promise<StorageUploadResult> {
  const adminSb = supabaseClient || (await createAdminClient());

  const effectiveMimeType = mimeType || (file instanceof File ? file.type : 'application/octet-stream') || 'application/octet-stream';
  const effectiveCategory = category || BUCKET_TO_DRIVE_CATEGORY[bucketName] || 'Other';
  const cleanFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Step 1: Check Google Drive connection and token validity
  let driveAccessToken: string | null = null;

  try {
    const validData = await getValidAccessToken(userId);
    if (validData?.accessToken) {
      driveAccessToken = validData.accessToken;
    }
  } catch (tokenErr: any) {
    console.warn(`[Storage Fallback] Google Drive token check failed for user ${userId}, selecting Supabase:`, tokenErr?.message || tokenErr);
  }

  // Step 2: Attempt Google Drive upload if connected and valid token exists
  if (driveAccessToken) {
    try {

      let fileBuffer: Buffer;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        fileBuffer = file;
      }

      // 15 second timeout for Google Drive API upload
      const driveResult = await withTimeout(
        uploadFileToGoogleDrive({
          filename: cleanFileName,
          mimeType: effectiveMimeType,
          fileBuffer,
          category: effectiveCategory,
        }),
        15000,
        'Google Drive upload timed out after 15 seconds'
      );

      if (driveResult.success && driveResult.googleDriveFileId) {
        const proxyUrl = `/api/drive/files/${driveResult.googleDriveFileId}`;
        return {
          success: true,
          url: proxyUrl,
          provider: 'google_drive',
          driveFileId: driveResult.googleDriveFileId,
        };
      }

      console.warn(`[Storage Fallback] Google Drive upload rejected for user ${userId}:`, driveResult.error || 'Unknown Drive error');
    } catch (driveErr: any) {
      console.warn(`[Storage Fallback] Google Drive upload failed for user ${userId}, switching to Supabase:`, driveErr?.message || driveErr);
    }
  }

  // Step 3: Fallback upload to Supabase Storage
  try {
    const fileExt = cleanFileName.includes('.') ? cleanFileName.split('.').pop() : 'bin';
    const uniqueFilename = cleanFileName.includes('-') && cleanFileName.length > 20
      ? cleanFileName
      : `${crypto.randomUUID()}-${Date.now()}.${fileExt}`;

    const filePath = pathPrefix ? `${pathPrefix}/${uniqueFilename}` : uniqueFilename;

    // Ensure bucket exists if needed
    try {
      const storageApi = adminSb.storage as any;
      if (typeof storageApi.getBucket === 'function') {
        const { error } = await storageApi.getBucket(bucketName);
        if (error && typeof storageApi.createBucket === 'function') {
          await storageApi.createBucket(bucketName, { public: true });
        }
      }
    } catch (e: any) {
      // Ignore bucket existence check errors
    }

    let uploadPayload: any = file;
    if (!(file instanceof File) && typeof Blob !== 'undefined') {
      uploadPayload = new Blob([new Uint8Array(file)], { type: effectiveMimeType });
    }

    const { error: uploadError } = await adminSb.storage
      .from(bucketName)
      .upload(filePath, uploadPayload, {
        contentType: effectiveMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[Storage Error] Supabase Storage upload failed for ${cleanFileName}:`, uploadError.message);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
        provider: 'supabase',
      };
    }

    const { data: { publicUrl } } = adminSb.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      provider: 'supabase',
      filePath,
    };
  } catch (supabaseErr: any) {
    console.error(`[Storage Error] Unexpected exception during Supabase Storage upload:`, supabaseErr?.message || supabaseErr);
    return {
      success: false,
      error: supabaseErr?.message || 'Supabase upload failed',
      provider: 'supabase',
    };
  }
}

/**
 * Uploads multiple files concurrently using the central storage abstraction service.
 */
export async function uploadMultipleFilesWithFallback({
  files,
  bucketName,
  pathPrefix = '',
  category,
  userId,
  supabaseClient,
}: {
  files: File[];
  bucketName: string;
  pathPrefix?: string;
  category?: string;
  userId: string;
  supabaseClient?: any;
}): Promise<StorageMultipleUploadResult> {
  const urls: string[] = [];
  const errors: string[] = [];
  const providers: Array<'google_drive' | 'supabase'> = [];

  const promises = files.map((file) => {
    if (!file || file.size === 0) return Promise.resolve(null);
    return uploadSingleFileWithFallback({
      file,
      filename: file.name,
      mimeType: file.type,
      bucketName,
      pathPrefix,
      category,
      userId,
      supabaseClient,
    });
  });

  const results = await Promise.all(promises);

  for (const res of results) {
    if (!res) continue;
    if (res.success && res.url) {
      urls.push(res.url);
      if (res.provider) providers.push(res.provider);
    } else if (res.error) {
      errors.push(res.error);
    }
  }

  return { urls, errors, providers };
}
