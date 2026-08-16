'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkBadges } from '@/features/gamification/actions/gamification';

// Authorization helper — verifies admin or instructor role
async function requireCourseRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor' && profile.role !== 'developer')) {
    throw new Error('Unauthorized: admin, instructor, or developer role required');
  }

  return { supabase, user, role: profile.role };
}
export async function addCourse(formData: FormData) {
  const { supabase, user } = await requireCourseRole();

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const difficulty = formData.get('difficulty') as string;
  const is_published = formData.get('is_published') === 'true';
  const enrollment_restriction = (formData.get('enrollment_restriction') as string) || 'any';

  const instructorIdsString = formData.get('instructor_ids') as string;
  const instructorIds: string[] = instructorIdsString 
    ? JSON.parse(instructorIdsString) 
    : [user?.id].filter(Boolean) as string[];

  if (!title) return { error: 'Title is required' };

  const { data: newCourse, error } = await supabase.from('courses').insert({
    title,
    description,
    difficulty,
    is_published,
    enrollment_restriction,
    created_by: user?.id,
  }).select('id').single();

  if (error) return { error: error.message };

  if (newCourse && instructorIds.length > 0) {
    const instructorInserts = instructorIds.map(instructorId => ({
      course_id: newCourse.id,
      instructor_id: instructorId
    }));
    const { error: linkError } = await supabase.from('course_instructors').insert(instructorInserts);
    if (linkError) return { error: linkError.message };
  }

  if (user?.id) {
    await checkBadges(user.id);
  }

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const { supabase } = await requireCourseRole();

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const difficulty = formData.get('difficulty') as string;
  const is_published = formData.get('is_published') === 'true';
  const enrollment_restriction = (formData.get('enrollment_restriction') as string) || 'any';

  const instructorIdsString = formData.get('instructor_ids') as string;
  const instructorIds: string[] = instructorIdsString ? JSON.parse(instructorIdsString) : [];

  const { error } = await supabase.from('courses').update({
    title,
    description,
    difficulty,
    is_published,
    enrollment_restriction,
  }).eq('id', id);

  if (error) return { error: error.message };

  // Update course_instructors join table by deleting old and inserting new
  const { error: deleteError } = await supabase.from('course_instructors').delete().eq('course_id', id);
  if (deleteError) return { error: deleteError.message };

  if (instructorIds.length > 0) {
    const instructorInserts = instructorIds.map(instructorId => ({
      course_id: id,
      instructor_id: instructorId
    }));
    const { error: linkError } = await supabase.from('course_instructors').insert(instructorInserts);
    if (linkError) return { error: linkError.message };
  }

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function deleteCourse(id: string) {
  const { supabase } = await requireCourseRole();

  // Soft delete the course
  const { error } = await supabase.from('courses').update({
    is_deleted: true,
    is_published: false
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function restoreCourse(id: string) {
  const { supabase } = await requireCourseRole();

  // Restore the course
  const { error } = await supabase.from('courses').update({
    is_deleted: false
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}
