'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

export async function enrollInCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();

  if (existing) {
    return { success: true };
  }

  const { error } = await supabase.from('enrollments').insert({
    user_id: user.id,
    course_id: courseId
  });

  if (!error) {
    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    const courseName = course?.title || 'the course';

    await supabase.from('feedbacks').insert({
      user_id: user.id,
      name: 'System',
      role: 'System',
      category: 'Notification',
      message: `Thank you for enrolling in ${courseName}. Please wait for instructor approval.`,
      status: 'open'
    });
    
    await awardXP(user.id, XP_VALUES.COURSE_JOIN, 'Joined a Course', 'enrollment', courseId);
  }

  if (error) return { error: error.message };

  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { success: true, message: 'Enrollment request sent. Pending instructor approval.' };
}

export async function enrollInCourseFormAction(courseId: string): Promise<void> {
  await enrollInCourse(courseId);
}
