'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface StorageUsageResult {
  success: boolean;
  databaseBytes: number;
  storageBytes: number;
  totalBytes: number;
  formattedTotal: string;
  formattedDatabaseBytes: string;
  formattedStorageBytes: string;
  formattedQuota: string;
  percentageUsed: number;
  unit: 'B' | 'KB' | 'MB' | 'GB';
  error?: string;
}

/**
 * Standardized byte size formatter according to system specifications:
 * - < 1024 B   -> X B
 * - < 1024 KB  -> X.X KB
 * - < 1024 MB  -> X.X MB
 * - Otherwise  -> X.XX GB
 */
export async function formatBytes(bytes: number): Promise<string> {
  if (!bytes || bytes <= 0) return '0 B';
  const ONE_KB = 1024;
  const ONE_MB = 1024 * ONE_KB;
  const ONE_GB = 1024 * ONE_MB;

  if (bytes < ONE_KB) {
    return `${bytes} B`;
  } else if (bytes < ONE_MB) {
    return `${(bytes / ONE_KB).toFixed(1)} KB`;
  } else if (bytes < ONE_GB) {
    return `${(bytes / ONE_MB).toFixed(1)} MB`;
  } else {
    return `${(bytes / ONE_GB).toFixed(2)} GB`;
  }
}

// Internal sync helper for server-side formatting
function formatBytesSync(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const ONE_KB = 1024;
  const ONE_MB = 1024 * ONE_KB;
  const ONE_GB = 1024 * ONE_MB;

  if (bytes < ONE_KB) {
    return `${bytes} B`;
  } else if (bytes < ONE_MB) {
    return `${(bytes / ONE_KB).toFixed(1)} KB`;
  } else if (bytes < ONE_GB) {
    return `${(bytes / ONE_MB).toFixed(1)} MB`;
  } else {
    return `${(bytes / ONE_GB).toFixed(2)} GB`;
  }
}

/**
 * Safely parses string values or serialized JSON string arrays of URLs.
 */
function extractUrlsFromString(val: any): string[] {
  if (!val) return [];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string');
        }
        if (typeof parsed === 'string') return [parsed];
      } catch (e) {}
    }
    return [val];
  }
  if (Array.isArray(val)) {
    return val.filter(item => typeof item === 'string');
  }
  return [];
}

/**
 * Production-ready server action to calculate actual per-user Database table row bytes
 * and Supabase Storage object bytes across all 15+ data sources without double-counting.
 * Enforces strict authentication & user ownership.
 */
export async function getUserStorageUsage(targetUserId?: string): Promise<StorageUsageResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        databaseBytes: 0,
        storageBytes: 0,
        totalBytes: 0,
        formattedTotal: '0 B',
        formattedDatabaseBytes: '0 B',
        formattedStorageBytes: '0 B',
        formattedQuota: '100 MB',
        percentageUsed: 0,
        unit: 'B',
        error: 'Not authenticated',
      };
    }

    // Security check: non-admins can only request their own storage usage
    const userIdToQuery = targetUserId || user.id;

    if (userIdToQuery !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return {
          success: false,
          databaseBytes: 0,
          storageBytes: 0,
          totalBytes: 0,
          formattedTotal: '0 B',
          formattedDatabaseBytes: '0 B',
          formattedStorageBytes: '0 B',
          formattedQuota: '100 MB',
          percentageUsed: 0,
          unit: 'B',
          error: 'Unauthorized access to user storage data',
        };
      }
    }

    const adminSb = await createAdminClient();

    let storageBytes = 0;
    let databaseBytes = 0;
    const trackedObjectNames = new Set<string>();
    const trackedMediaUrls = new Set<string>();

    // Helper to resolve public Supabase storage URLs to storage object sizes
    const trackStorageUrl = async (rawUrl: string | null | undefined) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const url = rawUrl.trim();
      if (!url || trackedMediaUrls.has(url)) return;
      trackedMediaUrls.add(url);

      const match = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const bucket = decodeURIComponent(match[1]);
        const objectPath = decodeURIComponent(match[2]);
        const uniqueKey = `${bucket}/${objectPath}`;

        if (!trackedObjectNames.has(uniqueKey)) {
          try {
            const { data: obj } = await adminSb
              .schema('storage')
              .from('objects')
              .select('metadata')
              .eq('bucket_id', bucket)
              .eq('name', objectPath)
              .maybeSingle();

            if (obj?.metadata) {
              const rawSize = (obj.metadata as any).size;
              const sizeNum = typeof rawSize === 'number' ? rawSize : parseInt(rawSize, 10);
              if (!isNaN(sizeNum) && sizeNum > 0) {
                storageBytes += sizeNum;
                trackedObjectNames.add(uniqueKey);
              }
            }
          } catch (e) {}
        }
      }
    };

    // -------------------------------------------------------------
    // PART 1: Query storage.objects directly (Objects owned by user)
    // -------------------------------------------------------------
    try {
      const { data: storageObjects, error } = await adminSb
        .schema('storage')
        .from('objects')
        .select('metadata, name, owner, bucket_id')
        .or(`owner.eq.${userIdToQuery},name.ilike.%${userIdToQuery}%`);

      if (!error && storageObjects && storageObjects.length > 0) {
        for (const obj of storageObjects) {
          if (obj.name && obj.bucket_id) {
            const key = `${obj.bucket_id}/${obj.name}`;
            if (trackedObjectNames.has(key)) continue;
            trackedObjectNames.add(key);
          }
          if (!obj.metadata) continue;

          const rawSize = (obj.metadata as any).size;
          if (typeof rawSize === 'number') {
            storageBytes += rawSize;
          } else if (typeof rawSize === 'string') {
            const parsed = parseInt(rawSize, 10);
            if (!isNaN(parsed)) {
              storageBytes += parsed;
            }
          }
        }
      }
    } catch (err) {
      console.error('[getUserStorageUsage storage.objects error]:', err);
    }

    // -------------------------------------------------------------
    // PART 2: Calculate Database Table Row Bytes & Linked File Storage
    // -------------------------------------------------------------
    const encoder = new TextEncoder();

    const processTableData = async (
      tableName: string,
      filterFn: (query: any) => any,
      urlColumns: string[] = []
    ) => {
      try {
        let q = adminSb.from(tableName).select('*');
        q = filterFn(q);
        const { data: rows } = await q;

        if (rows && rows.length > 0) {
          // Compute JSON UTF-8 byte size for user rows
          const jsonStr = JSON.stringify(rows);
          databaseBytes += encoder.encode(jsonStr).length;

          // Process file/media URL columns without double counting
          if (urlColumns.length > 0) {
            for (const row of rows) {
              for (const col of urlColumns) {
                const val = row[col];
                const extractedUrls = extractUrlsFromString(val);
                for (const u of extractedUrls) {
                  await trackStorageUrl(u);
                }
              }
            }
          }
        }
      } catch (e) {
        // Gracefully ignore tables that don't exist in current environment schema
      }
    };

    // Find course IDs created or instructed by the user
    let userCourseIds: string[] = [];
    try {
      const { data: ownedCourses } = await adminSb
        .from('courses')
        .select('id')
        .or(`created_by.eq.${userIdToQuery},instructor_id.eq.${userIdToQuery}`);

      if (ownedCourses && ownedCourses.length > 0) {
        userCourseIds = ownedCourses.map(c => c.id);
      }
    } catch (e) {}

    // Process all 15+ database tables
    await Promise.all([
      // 1. Profiles & Avatars
      processTableData('profiles', q => q.eq('id', userIdToQuery), ['avatar_url']),

      // 2. Courses
      processTableData('courses', q => q.or(`created_by.eq.${userIdToQuery},instructor_id.eq.${userIdToQuery}`), ['thumbnail_url']),

      // 3. Lessons (including PDF notes in lesson_notes bucket)
      processTableData(
        'lessons',
        q => userCourseIds.length > 0
          ? q.or(`created_by.eq.${userIdToQuery},course_id.in.(${userCourseIds.join(',')})`)
          : q.eq('created_by', userIdToQuery),
        ['pdf_url', 'pdf_notes_url', 'attachment_url', 'youtube_url']
      ),

      // 4. Assignments & Expected Output files
      processTableData(
        'assignments',
        q => userCourseIds.length > 0
          ? q.or(`created_by.eq.${userIdToQuery},course_id.in.(${userCourseIds.join(',')})`)
          : q.eq('created_by', userIdToQuery),
        ['expected_output', 'attachment_url', 'solution_url']
      ),

      // 5. Submissions
      processTableData('submissions', q => q.eq('user_id', userIdToQuery), ['file_url', 'attachment_url']),

      // 6. Doubts, Replies & Polls
      processTableData('doubts', q => q.eq('user_id', userIdToQuery), ['media_url', 'audio_url']),
      processTableData('doubt_replies', q => q.eq('user_id', userIdToQuery), ['media_url']),
      processTableData('doubt_likes', q => q.eq('user_id', userIdToQuery)),
      processTableData('course_polls', q => q.eq('created_by', userIdToQuery)),
      processTableData('poll_votes', q => q.eq('user_id', userIdToQuery)),

      // 7. Stories & Statuses
      processTableData('stories', q => q.eq('user_id', userIdToQuery), ['media_url', 'image_url']),

      // 8. Chat Messages & Notes
      processTableData('messages', q => q.eq('sender_id', userIdToQuery), ['attachment_url', 'media_url']),
      processTableData('chat_messages', q => q.eq('user_id', userIdToQuery), ['attachment_url']),
      processTableData('notes', q => q.eq('user_id', userIdToQuery)),

      // 9. Notices
      processTableData('notices', q => q.eq('created_by', userIdToQuery), ['image_url', 'attachment_url']),

      // 10. Certificates
      processTableData('certificates', q => q.eq('user_id', userIdToQuery), ['image_url']),
      processTableData('battle_certificates', q => q.eq('user_id', userIdToQuery), ['certificate_url']),

      // 11. Forum & Feedback
      processTableData('forum_posts', q => q.eq('user_id', userIdToQuery), ['attachment_url']),
      processTableData('forum_comments', q => q.eq('user_id', userIdToQuery)),
      processTableData('feedbacks', q => q.eq('user_id', userIdToQuery), ['screenshot_url']),
    ]);

    // Sum Total Bytes
    const totalBytes = databaseBytes + storageBytes;

    // Formatting & Quota Scaling
    const ONE_KB = 1024;
    const ONE_MB = 1024 * ONE_KB;
    const ONE_GB = 1024 * ONE_MB;

    let unit: 'B' | 'KB' | 'MB' | 'GB' = 'B';
    if (totalBytes >= ONE_GB) unit = 'GB';
    else if (totalBytes >= ONE_MB) unit = 'MB';
    else if (totalBytes >= ONE_KB) unit = 'KB';
    else unit = 'B';

    let quotaBytes = 100 * ONE_MB; // 100 MB default base quota
    let formattedQuota = '100 MB';

    if (totalBytes > 10 * ONE_GB) {
      const scaledQuotaGB = Math.ceil(totalBytes / (10 * ONE_GB)) * 10;
      quotaBytes = scaledQuotaGB * ONE_GB;
      formattedQuota = `${scaledQuotaGB} GB`;
    } else if (totalBytes > 100 * ONE_MB) {
      const scaledQuotaMB = Math.ceil(totalBytes / (100 * ONE_MB)) * 100;
      quotaBytes = scaledQuotaMB * ONE_MB;
      formattedQuota = `${scaledQuotaMB} MB`;
    }

    let percentageUsed = (totalBytes / quotaBytes) * 100;
    if (percentageUsed > 100) percentageUsed = 100;
    percentageUsed = Math.round(percentageUsed * 10) / 10;

    return {
      success: true,
      databaseBytes,
      storageBytes,
      totalBytes,
      formattedTotal: formatBytesSync(totalBytes),
      formattedDatabaseBytes: formatBytesSync(databaseBytes),
      formattedStorageBytes: formatBytesSync(storageBytes),
      formattedQuota,
      percentageUsed,
      unit,
    };
  } catch (err: any) {
    console.error('[getUserStorageUsage Exception]:', err);
    return {
      success: false,
      databaseBytes: 0,
      storageBytes: 0,
      totalBytes: 0,
      formattedTotal: '0 B',
      formattedDatabaseBytes: '0 B',
      formattedStorageBytes: '0 B',
      formattedQuota: '100 MB',
      percentageUsed: 0,
      unit: 'B',
      error: err.message || 'Failed to calculate storage usage',
    };
  }
}
