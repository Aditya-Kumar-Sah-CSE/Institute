'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActivityFeedItem } from '@/types/database';

export async function fetchActivityFeed(page: number = 1, limit: number = 20): Promise<ActivityFeedItem[]> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;
  
  const { data, error } = await supabase
    .from('activity_feed')
    .select(`
      *,
      profile:profiles(id, name, avatar_url, role, level)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }

  return data as unknown as ActivityFeedItem[];
}

export async function logActivity(activityType: string, metadata: any) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return;

  await supabase
    .from('activity_feed')
    .insert({
      user_id: userData.user.id,
      activity_type: activityType,
      metadata: metadata || {}
    });
}
