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
    const { error: feedbackError } = await adminSb.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Congratulations! Your application to become an instructor has been approved.',
      link: '/instructor'
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

    // On rejection, we do NOT change the profile status to rejected,
    // because they are still an active student.
    // They just can't become an instructor right now.
    
    // Send feedback notification
    await adminSb.from('notifications').insert({
      user_id: userId,
      type: 'system',
      message: 'Unfortunately, your application to become an instructor has been declined.',
      link: '/dashboard'
    });

    revalidatePath('/admin/instructor-requests');
    revalidatePath('/', 'layout');
  } catch (err: any) {
    console.error('rejectInstructor error:', err);
    throw err;
  }
}
