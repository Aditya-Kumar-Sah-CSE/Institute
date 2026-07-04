'use client';
// We need to fetch notifications on client-side for Realtime, 
// so the initial fetch can be done via client components using supabase/client 
// or via server actions. Let's provide server actions for marking as read.

import { createClient } from '@/lib/supabase/client';

export async function markNotificationAsRead(id: string) {
  const sb = createClient();
  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const sb = createClient();
  const { error } = await sb
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}
