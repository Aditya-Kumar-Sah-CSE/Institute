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

  if (!name || name.trim() === '') {
    return { error: 'Name is required' };
  }

  const updates: Record<string, string> = { name: name.trim() };
  if (institute_id !== null) updates.institute_id = institute_id.trim();
  if (batch !== null) updates.graduation_period = batch.trim();

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
