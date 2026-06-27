'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export async function approveInstructor(applicationId: string, userId: string) {
  try {
    const sb = await createClient();
    
    // Verify Admin
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', user?.id || '').single();
      if (profile?.role !== 'admin') throw new Error('Unauthorized');
    }

    const adminSb = await createAdminClient();

    // Update Application Status
    const { error: appError } = await adminSb.from('instructor_applications').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', applicationId);
    
    if (appError) throw new Error('Failed to update application: ' + appError.message);

    // Update Profile Status
    const { error: profileError } = await adminSb.from('profiles').update({
      status: 'active',
      role: 'instructor'
    }).eq('id', userId);

    if (profileError) throw new Error('Failed to update profile: ' + profileError.message);

    // Send feedback notification
    const { error: feedbackError } = await adminSb.from('feedbacks').insert({
      user_id: userId,
      name: 'System',
      role: 'System',
      category: 'Notification',
      message: 'Congratulations! Your application to become an instructor has been approved.',
      status: 'open'
    });

    if (feedbackError) throw new Error('Failed to send notification: ' + feedbackError.message);

    revalidatePath('/admin/instructor-requests');
    revalidatePath('/', 'layout');
  } catch (err: any) {
    console.error('approveInstructor error:', err);
    throw err; // Re-throw to be caught by the framework
  }
}

export async function rejectInstructor(applicationId: string, userId: string) {
  try {
    const sb = await createClient();
    
    // Verify Admin
    const { data: { user } } = await sb.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      const { data: profile } = await sb.from('profiles').select('role').eq('id', user?.id || '').single();
      if (profile?.role !== 'admin') throw new Error('Unauthorized');
    }

    const adminSb = await createAdminClient();

    // Update Application Status
    const { error: appError } = await adminSb.from('instructor_applications').update({
      status: 'rejected'
    }).eq('id', applicationId);
    
    if (appError) throw new Error('Failed to update application: ' + appError.message);

    // Update Profile Status
    const { error: profileError } = await adminSb.from('profiles').update({
      status: 'rejected'
    }).eq('id', userId);

    if (profileError) throw new Error('Failed to update profile: ' + profileError.message);

    revalidatePath('/admin/instructor-requests');
    revalidatePath('/', 'layout');
  } catch (err: any) {
    console.error('rejectInstructor error:', err);
    throw err;
  }
}
