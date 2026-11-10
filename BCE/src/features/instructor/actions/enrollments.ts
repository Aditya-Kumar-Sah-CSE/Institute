'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPendingEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || '').toLowerCase();
  const isAdminOrSuper = ['super_admin', 'superadmin', 'admin', 'developer', 'platform_owner'].includes(role);

  let query = supabase
    .from('enrollments')
    .select('id, status, enrolled_at, courses(title), profiles!inner(name, email, institute_id)')
    .eq('status', 'pending')
    .order('enrolled_at', { ascending: false });

  if (!isAdminOrSuper) {
    // Get courses created by this instructor
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('created_by', user.id);

    if (!courses || courses.length === 0) return { data: [] };

    const courseIds = courses.map(c => c.id);
    query = query.in('course_id', courseIds);
  }

  const { data: enrollments, error } = await query;

  if (error) return { error: error.message };

  return { data: enrollments };
}

export async function approveEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const adminSupabase = await createAdminClient();

  const { data: enrollment, error: fetchErr } = await adminSupabase
    .from('enrollments')
    .select('user_id, course_id, courses(title, created_by)')
    .eq('id', enrollmentId)
    .single();

  if (fetchErr || !enrollment) {
    return { error: fetchErr?.message || 'Enrollment not found' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || '').toLowerCase();
  const isSuperOrAdmin = ['super_admin', 'superadmin', 'admin', 'developer', 'platform_owner'].includes(role);
  const courseCreator = (enrollment.courses as any)?.created_by;
  const isCreator = courseCreator === user.id;

  if (!isSuperOrAdmin && !isCreator && role !== 'instructor') {
    return { error: 'Unauthorized to approve this enrollment' };
  }

  const { error } = await adminSupabase
    .from('enrollments')
    .update({ status: 'approved' })
    .eq('id', enrollmentId);

  if (error) return { error: error.message };

  const courseTitle = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]?.title
    : (enrollment.courses as { title: string } | null)?.title || 'the course';

  try {
    await adminSupabase.from('notifications').insert({
      user_id: enrollment.user_id,
      type: 'system',
      message: `Congratulations! Your enrollment in ${courseTitle} has been approved.`,
      link: `/courses/${enrollment.course_id}`
    });
  } catch (notifErr) {
    console.warn('Non-critical notification insert warning:', notifErr);
  }

  if (enrollment.course_id) {
    revalidatePath(`/courses/${enrollment.course_id}`);
  }
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/admin/enrollments');
  revalidatePath('/admin/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function rejectEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const adminSupabase = await createAdminClient();
  
  const { data: enrollment, error: fetchErr } = await adminSupabase
    .from('enrollments')
    .select('user_id, course_id, courses(title, created_by)')
    .eq('id', enrollmentId)
    .single();

  if (fetchErr || !enrollment) {
    return { error: fetchErr?.message || 'Enrollment not found' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || '').toLowerCase();
  const isSuperOrAdmin = ['super_admin', 'superadmin', 'admin', 'developer', 'platform_owner'].includes(role);
  const courseCreator = (enrollment.courses as any)?.created_by;
  const isCreator = courseCreator === user.id;

  if (!isSuperOrAdmin && !isCreator && role !== 'instructor') {
    return { error: 'Unauthorized to reject this enrollment' };
  }

  const { error } = await adminSupabase
    .from('enrollments')
    .update({ status: 'rejected' })
    .eq('id', enrollmentId);

  if (error) return { error: error.message };

  const courseTitle = Array.isArray(enrollment.courses)
    ? enrollment.courses[0]?.title
    : (enrollment.courses as { title: string } | null)?.title || 'the course';

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

  if (enrollment.course_id) {
    revalidatePath(`/courses/${enrollment.course_id}`);
  }
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/admin/enrollments');
  revalidatePath('/admin/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function approveEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await approveEnrollment(enrollmentId);
}

export async function rejectEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await rejectEnrollment(enrollmentId);
}
