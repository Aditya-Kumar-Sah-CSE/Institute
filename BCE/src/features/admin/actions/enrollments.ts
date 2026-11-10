'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ALLOWED_ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'instructor', 'developer', 'platform_owner'];

export async function getAllPendingEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Fetch all pending enrollments globally for Admins
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, status, enrolled_at, courses(title), profiles!inner(name, email)')
    .eq('status', 'pending')
    .order('enrolled_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: enrollments };
}

export async function adminApproveEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || '').toLowerCase();
  if (!profile || !ALLOWED_ADMIN_ROLES.includes(role)) {
    return { error: 'Unauthorized: admin, instructor, or developer role required' };
  }

  const adminSupabase = await createAdminClient();

  const { error } = await adminSupabase
    .from('enrollments')
    .update({ status: 'approved' })
    .eq('id', enrollmentId);

  let courseId = '';
  if (!error) {
    const { data: enrollment } = await adminSupabase
      .from('enrollments')
      .select('user_id, course_id, courses(title)')
      .eq('id', enrollmentId)
      .single();

    if (enrollment) {
      courseId = enrollment.course_id;
      const courseTitle = Array.isArray(enrollment.courses) ? enrollment.courses[0]?.title : (enrollment.courses as { title: string } | null)?.title || 'the course';
      try {
        await adminSupabase.from('notifications').insert({
          user_id: enrollment.user_id,
          type: 'system',
          message: `Congratulations! Your enrollment in ${courseTitle} has been approved.`,
          link: `/courses/${courseId}`
        });
      } catch (notifErr) {
        console.warn('Non-critical notification insert warning:', notifErr);
      }
    }
  }

  if (error) return { error: error.message };

  if (courseId) {
    revalidatePath(`/courses/${courseId}`);
  }
  revalidatePath('/admin/enrollments');
  revalidatePath('/admin/students');
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function adminRejectEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || '').toLowerCase();
  if (!profile || !ALLOWED_ADMIN_ROLES.includes(role)) {
    return { error: 'Unauthorized: admin, instructor, or developer role required' };
  }
  
  const adminSupabase = await createAdminClient();

  const { data: enrollment } = await adminSupabase
    .from('enrollments')
    .select('user_id, course_id, courses(title)')
    .eq('id', enrollmentId)
    .single();

  const { error } = await adminSupabase
    .from('enrollments')
    .update({ status: 'rejected' })
    .eq('id', enrollmentId);

  if (!error && enrollment) {
    const courseTitle = Array.isArray(enrollment.courses) ? enrollment.courses[0]?.title : (enrollment.courses as { title: string } | null)?.title || 'the course';
    try {
      await adminSupabase.from('notifications').insert({
        user_id: enrollment.user_id,
        type: 'system',
        message: `Your enrollment in ${courseTitle} has been rejected.`,
        link: `/catalog`
      });
    } catch (notifErr) {
      console.warn('Non-critical notification insert warning:', notifErr);
    }
  }

  if (error) return { error: error.message };

  if (enrollment?.course_id) {
    revalidatePath(`/courses/${enrollment.course_id}`);
  }
  revalidatePath('/admin/enrollments');
  revalidatePath('/admin/students');
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function adminApproveEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await adminApproveEnrollment(enrollmentId);
}

export async function adminRejectEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await adminRejectEnrollment(enrollmentId);
}
