'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addCourse(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const supabase = await createClient();

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
  const supabase = await createClient();
  
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
  const supabase = await createClient();
  
  // Restore the course
  const { error } = await supabase.from('courses').update({ 
    is_deleted: false 
  }).eq('id', id);
  
  if (error) return { error: error.message };

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}
