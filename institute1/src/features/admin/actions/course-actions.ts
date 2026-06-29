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

  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
    throw new Error('Unauthorized: admin or instructor role required');
  }

  return { supabase, user, role: profile.role };
}
export async function addCourse(formData: FormData) {
  const { supabase, user } = await requireCourseRole();

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const difficulty = formData.get('difficulty') as string;
  const is_published = formData.get('is_published') === 'true';

  if (!title) return { error: 'Title is required' };

  const { error } = await supabase.from('courses').insert({
    title,
    description,
    difficulty,
    is_published,
    created_by: user?.id,
  });

  if (error) return { error: error.message };

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

  const { error } = await supabase.from('courses').update({
    title,
    description,
    difficulty,
    is_published,
  }).eq('id', id);

  if (error) return { error: error.message };

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
