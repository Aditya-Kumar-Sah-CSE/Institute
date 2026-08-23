'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface StorageUsageResult {
  success: boolean;
  bytes: number;
  dbBytes: number;
  storageBytes: number;
  formattedUsed: string;
  formattedQuota: string;
  percentage: number;
  unit: 'MB' | 'GB';
  error?: string;
}

/**
 * Parses single URL strings or serialized JSON string arrays of URLs.
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
 * Calculates total storage & database usage for a given user across ALL platform features:
 * - Supabase Storage files (Avatars, Course PDFs, Lesson Notes, Assignment Attachments, Doubts Media, Stories, Notices, Submissions)
 * - Real Database rows (Courses, Lessons, Assignments, Submissions, Doubts, Polls, Chats, Stories, Statuses, Notices, Certificates, Forum Posts/Comments)
 * Work strictly in BCE repository context.
 */
export async function getUserStorageUsage(targetUserId?: string): Promise<StorageUsageResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        bytes: 0,
        dbBytes: 0,
        storageBytes: 0,
        formattedUsed: '0 MB',
        formattedQuota: '100 MB',
        percentage: 0,
        unit: 'MB',
        error: 'Not authenticated',
      };
    }

    // Determine target user ID & enforce security
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
          bytes: 0,
          dbBytes: 0,
          storageBytes: 0,
          formattedUsed: '0 MB',
          formattedQuota: '100 MB',
          percentage: 0,
          unit: 'MB',
          error: 'Unauthorized access to user storage data',
        };
      }
    }

    const adminSb = await createAdminClient();

    let storageBytes = 0;
    let dbBytes = 0;
    const trackedObjectNames = new Set<string>();
    const trackedMediaUrls = new Set<string>();

    // Helper to extract storage object path from public URL and fetch size if not tracked
    const trackStorageUrl = async (rawUrl: string | null | undefined) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const url = rawUrl.trim();
      if (!url || trackedMediaUrls.has(url)) return;
      trackedMediaUrls.add(url);

      // Match Supabase storage URL patterns e.g. .../object/public/bucketName/objectPath
      const match = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const bucket = decodeURIComponent(match[1]);
        const objectPath = decodeURIComponent(match[2]);
        if (!trackedObjectNames.has(`${bucket}/${objectPath}`)) {
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
                trackedObjectNames.add(`${bucket}/${objectPath}`);
              }
            }
          } catch (e) {}
        }
      }
    };

    // -------------------------------------------------------------
    // PART 1: Direct Storage Objects Query (User-owned objects)
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
            trackedObjectNames.add(`${obj.bucket_id}/${obj.name}`);
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
      console.error('[BCE storage.objects query error]:', err);
    }

    // -------------------------------------------------------------
    // PART 2: Database Rows & File URL Extraction Across All Tables
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
          // Add JSON row size to dbBytes
          const jsonStr = JSON.stringify(rows);
          dbBytes += encoder.encode(jsonStr).length;

          // Process URL columns for storage files
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
        // Table might not exist or error gracefully ignored
      }
    };

    // 1. Get Courses owned or instructed by user
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

    // Process all tables concurrently
    await Promise.all([
      // A. Profiles & Avatars
      processTableData('profiles', q => q.eq('id', userIdToQuery), ['avatar_url']),

      // B. Courses created by user
      processTableData('courses', q => q.or(`created_by.eq.${userIdToQuery},instructor_id.eq.${userIdToQuery}`), ['thumbnail_url']),

      // C. Lessons (including PDFs in lesson_notes bucket!)
      processTableData(
        'lessons',
        q => userCourseIds.length > 0
          ? q.or(`created_by.eq.${userIdToQuery},course_id.in.(${userCourseIds.join(',')})`)
          : q.eq('created_by', userIdToQuery),
        ['pdf_url', 'pdf_notes_url', 'attachment_url', 'youtube_url']
      ),

      // D. Assignments & Expected Output files
      processTableData(
        'assignments',
        q => userCourseIds.length > 0
          ? q.or(`created_by.eq.${userIdToQuery},course_id.in.(${userCourseIds.join(',')})`)
          : q.eq('created_by', userIdToQuery),
        ['expected_output', 'attachment_url', 'solution_url']
      ),

      // E. Submissions
      processTableData('submissions', q => q.eq('user_id', userIdToQuery), ['file_url', 'attachment_url']),

      // F. Doubts, Replies & Polls
      processTableData('doubts', q => q.eq('user_id', userIdToQuery), ['media_url', 'audio_url']),
      processTableData('doubt_replies', q => q.eq('user_id', userIdToQuery), ['media_url']),
      processTableData('doubt_likes', q => q.eq('user_id', userIdToQuery)),
      processTableData('course_polls', q => q.eq('created_by', userIdToQuery)),
      processTableData('poll_votes', q => q.eq('user_id', userIdToQuery)),

      // G. Stories & Statuses
      processTableData('stories', q => q.eq('user_id', userIdToQuery), ['media_url', 'image_url']),

      // H. Chat Messages & Notes
      processTableData('messages', q => q.eq('sender_id', userIdToQuery), ['attachment_url', 'media_url']),
      processTableData('chat_messages', q => q.eq('user_id', userIdToQuery), ['attachment_url']),
      processTableData('notes', q => q.eq('user_id', userIdToQuery)),

      // I. Notices
      processTableData('notices', q => q.eq('created_by', userIdToQuery), ['image_url', 'attachment_url']),

      // J. Certificates
      processTableData('certificates', q => q.eq('user_id', userIdToQuery), ['image_url']),
      processTableData('battle_certificates', q => q.eq('user_id', userIdToQuery), ['certificate_url']),

      // K. Forum & Feedback
      processTableData('forum_posts', q => q.eq('user_id', userIdToQuery), ['attachment_url']),
      processTableData('forum_comments', q => q.eq('user_id', userIdToQuery)),
      processTableData('feedbacks', q => q.eq('user_id', userIdToQuery), ['screenshot_url']),
    ]);

    // Sum total real usage (Storage Files + DB Row Data)
    const totalBytes = storageBytes + dbBytes;

    // Calculate MB and GB values
    const ONE_MB = 1024 * 1024;
    const ONE_GB = 1024 * ONE_MB;

    const usedMB = totalBytes / ONE_MB;
    const usedGB = totalBytes / ONE_GB;

    let unit: 'MB' | 'GB' = 'MB';
    let formattedUsed = '0 MB';
    let formattedQuota = '100 MB';
    let quotaBytes = 100 * ONE_MB; // 100 MB default quota

    if (usedMB >= 1024) {
      unit = 'GB';
      formattedUsed = `${usedGB.toFixed(2)} GB`;
      
      if (usedGB > 10) {
        const scaledQuotaGB = Math.ceil(usedGB / 10) * 10;
        quotaBytes = scaledQuotaGB * ONE_GB;
        formattedQuota = `${scaledQuotaGB} GB`;
      } else {
        quotaBytes = 10 * ONE_GB;
        formattedQuota = '10 GB';
      }
    } else {
      unit = 'MB';
      if (totalBytes === 0) {
        formattedUsed = '0 MB';
      } else if (usedMB < 0.01) {
        const usedKB = totalBytes / 1024;
        formattedUsed = `${usedKB.toFixed(1)} KB`;
      } else if (usedMB < 0.1) {
        formattedUsed = `${usedMB.toFixed(2)} MB`;
      } else {
        formattedUsed = `${usedMB.toFixed(1)} MB`;
      }

      if (usedMB > 100) {
        const scaledQuotaMB = Math.ceil(usedMB / 100) * 100;
        quotaBytes = scaledQuotaMB * ONE_MB;
        formattedQuota = `${scaledQuotaMB} MB`;
      } else {
        quotaBytes = 100 * ONE_MB;
        formattedQuota = '100 MB';
      }
    }

    let percentage = (totalBytes / quotaBytes) * 100;
    if (percentage > 100) percentage = 100;
    percentage = Math.round(percentage * 10) / 10;

    return {
      success: true,
      bytes: totalBytes,
      dbBytes,
      storageBytes,
      formattedUsed,
      formattedQuota,
      percentage,
      unit,
    };
  } catch (err: any) {
    console.error('[BCE getUserStorageUsage Exception]:', err);
    return {
      success: false,
      bytes: 0,
      dbBytes: 0,
      storageBytes: 0,
      formattedUsed: '0 MB',
      formattedQuota: '100 MB',
      percentage: 0,
      unit: 'MB',
      error: err.message || 'Failed to calculate storage usage',
    };
  }
}
