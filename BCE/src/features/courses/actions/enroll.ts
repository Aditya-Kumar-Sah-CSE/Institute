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
  const { data: course } = await supabase.from('courses').select('title, enrollment_restriction, created_by').eq('id', courseId).single();
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
      const { data: userProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      const studentName = userProfile?.name || 'A student';
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      
      const notifications = [];
      // Student notification
      notifications.push({
        user_id: user.id,
        type: 'system',
        message: `Thank you for enrolling in ${courseName}. Please wait for instructor approval.`,
        link: '/dashboard'
      });

      // Faculty/Admin notifications
      const staffToNotify = new Set(admins?.map((a: any) => a.id) || []);
      if (course?.created_by) staffToNotify.add(course.created_by);
      staffToNotify.delete(user.id);

      staffToNotify.forEach(staffId => {
        notifications.push({
          user_id: staffId,
          type: 'enrollment_request',
          message: `${studentName} has requested to enroll in ${courseName}.`,
          link: `/courses/${courseId}`
        });
      });

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
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
  revalidatePath('/admin/enrollments');
  revalidatePath('/instructor/enrollments');
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { students: [], total: 0 };

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

  // Simplify reapply: just delete the rejected enrollment so the user can use the normal Enroll button again.
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .eq('status', 'rejected');

  if (error) return { error: error.message };

  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/admin/enrollments');
  revalidatePath('/instructor/enrollments');
  revalidatePath('/', 'layout');
  
  return { success: true, message: 'Reset successfully. You can now enroll again.' };
}

export async function reapplyEnrollmentFormAction(courseId: string): Promise<void> {
  await reapplyEnrollment(courseId);
}

export async function removeStudentEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Verify staff/faculty/admin or course creator
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isStaff = profile && ['admin', 'instructor', 'developer'].includes(profile.role);

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id, courses(created_by)')
    .eq('id', enrollmentId)
    .single();

  if (!enrollment) return { error: 'Enrollment not found' };

  const courseCreator = Array.isArray(enrollment.courses) ? enrollment.courses[0]?.created_by : (enrollment.courses as any)?.created_by;
  if (!isStaff && courseCreator !== user.id) {
    return { error: 'Unauthorized to remove this enrollment' };
  }

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) return { error: error.message };

  if (enrollment.course_id) {
    revalidatePath(`/courses/${enrollment.course_id}`);
    revalidatePath(`/admin/courses/${enrollment.course_id}/builder`);
    revalidatePath(`/instructor/courses/${enrollment.course_id}/builder`);
  }
  revalidatePath('/instructor/students');
  revalidatePath('/admin/students');
  revalidatePath('/instructor/enrollments');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Student enrollment removed successfully.' };
}

