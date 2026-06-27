'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export async function approveInstructor(applicationId: string, userId: string) {
  const sb = await createClient();
  
  // Verify Admin
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user?.id || '').single();
    if (profile?.role !== 'admin') throw new Error('Unauthorized');
  }

  const adminSb = await createAdminClient();

  // Update Application Status
  await adminSb.from('instructor_applications').update({
    status: 'approved',
    approved_at: new Date().toISOString()
  }).eq('id', applicationId);

  // Update Profile Status
  await adminSb.from('profiles').update({
    status: 'active',
    role: 'instructor'
  }).eq('id', userId);

  // Send feedback notification
  await adminSb.from('feedbacks').insert({
    user_id: userId,
    name: 'System',
    role: 'System',
    category: 'Notification',
    message: 'Congratulations! Your application to become an instructor has been approved.',
    status: 'open'
  });

  revalidatePath('/admin/instructor-requests');
  revalidatePath('/', 'layout');
}

export async function rejectInstructor(applicationId: string, userId: string) {
  const sb = await createClient();
  
  // Verify Admin
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user?.id || '').single();
    if (profile?.role !== 'admin') throw new Error('Unauthorized');
  }

  const adminSb = await createAdminClient();

  // Update Application Status
  await adminSb.from('instructor_applications').update({
    status: 'rejected'
  }).eq('id', applicationId);

  // Update Profile Status
  await adminSb.from('profiles').update({
    status: 'rejected'
  }).eq('id', userId);

  revalidatePath('/admin/instructor-requests');
  revalidatePath('/', 'layout');
}
