'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface StorageUsageResult {
  success: boolean;
  bytes: number;
  formattedUsed: string;
  formattedQuota: string;
  percentage: number;
  unit: 'MB' | 'GB';
  error?: string;
}

/**
 * Calculates total storage used by a specific user across Supabase Storage buckets.
 * Defaults to current logged-in user. Non-admin users can only view their own usage.
 */
export async function getUserStorageUsage(targetUserId?: string): Promise<StorageUsageResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        bytes: 0,
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
      // Check if logged in user is admin before allowing query for another user
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return {
          success: false,
          bytes: 0,
          formattedUsed: '0 MB',
          formattedQuota: '100 MB',
          percentage: 0,
          unit: 'MB',
          error: 'Unauthorized access to user storage data',
        };
      }
    }

    const adminSb = await createAdminClient();

    let totalBytes = 0;
    const trackedObjectNames = new Set<string>();

    // 1. Query storage.objects where owner equals user ID OR object name contains user ID
    try {
      const { data: storageObjects, error } = await adminSb
        .schema('storage')
        .from('objects')
        .select('metadata, name, owner')
        .or(`owner.eq.${userIdToQuery},name.ilike.%${userIdToQuery}%`);

      if (!error && storageObjects && storageObjects.length > 0) {
        for (const obj of storageObjects) {
          if (obj.name) trackedObjectNames.add(obj.name);
          if (!obj.metadata) continue;

          const rawSize = (obj.metadata as any).size;
          if (typeof rawSize === 'number') {
            totalBytes += rawSize;
          } else if (typeof rawSize === 'string') {
            const parsed = parseInt(rawSize, 10);
            if (!isNaN(parsed)) {
              totalBytes += parsed;
            }
          }
        }
      }
    } catch (err) {
      console.error('[getUserStorageUsage storage.objects query error]:', err);
    }

    // 2. Check profile avatar_url if not already tracked
    try {
      const { data: profile } = await adminSb
        .from('profiles')
        .select('avatar_url')
        .eq('id', userIdToQuery)
        .single();

      if (profile?.avatar_url) {
        const match = profile.avatar_url.match(/\/object\/public\/([^/]+)\/(.+)$/);
        if (match) {
          const bucket = match[1];
          const objectPath = match[2];
          if (!trackedObjectNames.has(objectPath)) {
            const { data: avatarObj } = await adminSb
              .schema('storage')
              .from('objects')
              .select('metadata')
              .eq('bucket_id', bucket)
              .eq('name', objectPath)
              .maybeSingle();

            if (avatarObj?.metadata) {
              const rawSize = (avatarObj.metadata as any).size;
              const sizeNum = typeof rawSize === 'number' ? rawSize : parseInt(rawSize, 10);
              if (!isNaN(sizeNum) && sizeNum > 0) {
                totalBytes += sizeNum;
                trackedObjectNames.add(objectPath);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[getUserStorageUsage profile avatar check error]:', err);
    }

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
      formattedUsed = `${usedGB.toFixed(1)} GB`;
      
      // Dynamic quota scaling for > 1GB
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
      // Format MB (1 decimal place if > 0, e.g. 24.6 MB or 0 MB)
      if (totalBytes === 0) {
        formattedUsed = '0 MB';
      } else if (usedMB < 0.1) {
        formattedUsed = `${usedMB.toFixed(2)} MB`;
      } else {
        formattedUsed = `${usedMB.toFixed(1)} MB`;
      }

      // Dynamic quota scaling for > 100MB up to 1024MB
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
    
    // Round percentage to 1 decimal place (e.g. 24.6%)
    percentage = Math.round(percentage * 10) / 10;

    return {
      success: true,
      bytes: totalBytes,
      formattedUsed,
      formattedQuota,
      percentage,
      unit,
    };
  } catch (err: any) {
    console.error('[getUserStorageUsage Exception]:', err);
    return {
      success: false,
      bytes: 0,
      formattedUsed: '0 MB',
      formattedQuota: '100 MB',
      percentage: 0,
      unit: 'MB',
      error: err.message || 'Failed to calculate storage usage',
    };
  }
}
