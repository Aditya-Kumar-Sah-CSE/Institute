'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateBasicProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const name = formData.get('name') as string;
  const institute_id = formData.get('institute_id') as string;
  const batch = formData.get('batch') as string;
  const college_name = formData.get('college_name') as string;

  if (!name || name.trim() === '') {
    return { error: 'Name is required' };
  }

  const updates: Record<string, string> = { name: name.trim() };
  if (institute_id !== null) updates.institute_id = institute_id.trim();
  if (batch !== null) updates.graduation_period = batch.trim();
  if (college_name !== null) updates.college_name = college_name.trim();

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile' };
  }

  revalidatePath('/profile');
  return { success: true };
}

export async function fetchMoreActivityLogs(userId: string, offset: number, limit = 5) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('xp_log')
    .select('id, action, xp_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  return data;
}
