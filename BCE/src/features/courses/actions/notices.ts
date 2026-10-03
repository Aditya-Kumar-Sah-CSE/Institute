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

export async function deleteCourseNotice(courseId: string, noticeId: string) {
  if (!courseId || !noticeId) {
    return { success: false as const, error: 'Course ID and Notice ID are required.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: 'Not authenticated.' };

  const [{ data: notice }, { data: course }, { data: profile }] = await Promise.all([
    supabase.from('course_notices').select('created_by, course_id').eq('id', noticeId).maybeSingle(),
    supabase.from('courses').select('created_by').eq('id', courseId).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ]);

  if (!notice) return { success: false as const, error: 'Notice not found.' };

  const isAuthor = notice.created_by === user.id;
  const isCourseCreator = course?.created_by === user.id;
  const isAdmin = ['admin', 'super_admin', 'superadmin', 'developer'].includes((profile?.role || '').toLowerCase());

  if (!isAuthor && !isCourseCreator && !isAdmin) {
    const { data: isFaculty } = await supabase
      .from('course_instructors')
      .select('id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .maybeSingle();

    if (!isFaculty) {
      return { success: false as const, error: 'You are not authorized to delete this notice.' };
    }
  }

  const { error } = await supabase.from('course_notices').delete().eq('id', noticeId);
  if (error) {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSb = await createAdminClient();
    const { error: adminError } = await adminSb.from('course_notices').delete().eq('id', noticeId);
    if (adminError) return { success: false as const, error: adminError.message };
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath('/notices');
  return { success: true as const };
}
