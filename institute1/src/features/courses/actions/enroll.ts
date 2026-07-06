'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

export async function enrollInCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Fetch course details first to check restriction
  const { data: course } = await supabase.from('courses').select('title, enrollment_restriction').eq('id', courseId).single();
  const courseName = course?.title || 'the course';
  const restriction = course?.enrollment_restriction || 'any';
  const initialStatus = restriction === 'any' ? 'approved' : 'pending';

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (existing) {
    if (existing.status === 'pending') {
      return { success: true, message: 'Enrollment request already pending.' };
    }
    return { success: true };
  }

  const { error } = await supabase.from('enrollments').insert({
    user_id: user.id,
    course_id: courseId,
    status: initialStatus
  });

  if (!error) {
    if (initialStatus === 'pending') {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'system',
        message: `Thank you for enrolling in ${courseName}. Please wait for instructor approval.`,
        link: '/dashboard'
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'system',
        message: `You have successfully enrolled in ${courseName}. Happy learning!`,
        link: `/courses/${courseId}`
      });
      await awardXP(user.id, XP_VALUES.COURSE_JOIN, 'Joined a Course', 'enrollment', courseId);
    }
  }

  if (error) return { error: error.message };

  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  
  if (initialStatus === 'pending') {
    return { success: true, message: 'Enrollment request sent. Pending instructor approval.' };
  } else {
    return { success: true, message: 'Successfully enrolled in course.' };
  }
}

export async function enrollInCourseFormAction(courseId: string): Promise<void> {
  await enrollInCourse(courseId);
}

export async function leaveCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', user.id)
    .eq('course_id', courseId);

  if (error) return { error: error.message };

  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Left the course successfully.' };
}

export async function leaveCourseFormAction(courseId: string): Promise<void> {
  await leaveCourse(courseId);
}

export async function getTopEnrolledStudents(courseId: string, limit: number = 3) {
  const adminClient = await createAdminClient();
  const { data } = await adminClient
    .from('enrollments')
    .select('user_id, profiles(name, avatar_url)')
    .eq('course_id', courseId)
    .eq('status', 'approved')
    .limit(limit);
  
  const { count } = await adminClient
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'approved');

  return { students: data || [], total: count || 0 };
}

export async function reapplyEnrollment(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Fetch course details first to check restriction
  const { data: course } = await supabase.from('courses').select('title, enrollment_restriction').eq('id', courseId).single();
  const restriction = course?.enrollment_restriction || 'any';
  const initialStatus = restriction === 'any' ? 'approved' : 'pending';

  const { error } = await supabase
    .from('enrollments')
    .update({ status: initialStatus })
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'rejected'); // Safety check, only if rejected

  if (error) return { error: error.message };

  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  
  if (initialStatus === 'pending') {
    return { success: true, message: 'Reapplied successfully. Pending instructor approval.' };
  } else {
    return { success: true, message: 'Successfully re-enrolled in course.' };
  }
}

export async function reapplyEnrollmentFormAction(courseId: string): Promise<void> {
  await reapplyEnrollment(courseId);
}

