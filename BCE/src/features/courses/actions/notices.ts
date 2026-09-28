'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCourseNotice(courseId: string, title: string, content: string) {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  if (!cleanTitle || !cleanContent) return { success: false as const, error: 'Title and notice are required.' };
  if (cleanTitle.length > 120 || cleanContent.length > 3000) return { success: false as const, error: 'Title or notice is too long.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'Not authenticated.' };

  const { data: notice, error } = await supabase.from('course_notices').insert({
    course_id: courseId,
    created_by: user.id,
    title: cleanTitle,
    content: cleanContent,
  }).select('id, course_id, created_by, title, content, created_at').single();
  if (error) return { success: false as const, error: error.message };

  revalidatePath(`/courses/${courseId}`);
  return { success: true as const, notice };
}

export async function getCourseNotices(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_notices')
    .select('id, course_id, created_by, title, content, created_at, profiles:created_by(name)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: null,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return { data, error: null };
}
