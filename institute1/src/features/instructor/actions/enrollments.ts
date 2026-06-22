'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPendingEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Get courses created by this instructor
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('created_by', user.id);

  if (!courses || courses.length === 0) return { data: [] };

  const courseIds = courses.map(c => c.id);

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, status, enrolled_at, courses(title), profiles!inner(name, email)')
    .in('course_id', courseIds)
    .eq('status', 'pending')
    .order('enrolled_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: enrollments };
}

export async function approveEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'approved' })
    .eq('id', enrollmentId);

  let courseId = '';
  if (!error) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('user_id, course_id, courses(title)')
      .eq('id', enrollmentId)
      .single();

    if (enrollment) {
      courseId = enrollment.course_id;
      const courseTitle = Array.isArray(enrollment.courses) ? enrollment.courses[0]?.title : (enrollment.courses as { title: string } | null)?.title || 'the course';
      await supabase.from('feedbacks').insert({
        user_id: enrollment.user_id,
        name: 'System',
        role: 'System',
        category: 'Notification',
        message: `Congratulations! Your enrollment in ${courseTitle} has been approved.`,
        status: 'open'
      });
    }
  }

  if (error) return { error: error.message };

  if (courseId) {
    revalidatePath(`/courses/${courseId}`);
  }
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/admin/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function rejectEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('id', enrollmentId)
    .single();

  const { error } = await supabase
    .from('enrollments')
    .update({ status: 'rejected' })
    .eq('id', enrollmentId);

  if (error) return { error: error.message };

  if (enrollment?.course_id) {
    revalidatePath(`/courses/${enrollment.course_id}`);
  }
  revalidatePath('/instructor/enrollments');
  revalidatePath('/instructor/students');
  revalidatePath('/admin/students');
  revalidatePath('/courses');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function approveEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await approveEnrollment(enrollmentId);
}

export async function rejectEnrollmentFormAction(enrollmentId: string): Promise<void> {
  await rejectEnrollment(enrollmentId);
}
