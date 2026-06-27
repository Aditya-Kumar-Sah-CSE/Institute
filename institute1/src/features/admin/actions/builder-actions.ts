'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Authorization helper — verifies the user has admin or instructor role
async function requireBuilderRole() {
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

// --- LESSON ACTIONS ---

export async function addLesson(courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const youtube_url = formData.get('youtube_url') as string;
  const notes = formData.get('notes') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '20');
  const sort_order = parseInt(formData.get('sort_order') as string || '1');
  const week_number = parseInt(formData.get('week_number') as string || '1');
  const pdf_file = formData.get('pdf_file') as File | null;

  if (!title) return { error: 'Lesson title is required' };

  let pdf_url = null;
  if (pdf_file && pdf_file.size > 0) {
    const fileExt = pdf_file.name.split('.').pop();
    const filePath = `notes/lesson_${courseId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('lesson_notes')
      .upload(filePath, pdf_file, { upsert: true });

    if (uploadError) return { error: `Failed to upload note: ${uploadError.message}` };

    const { data: { publicUrl } } = supabase.storage
      .from('lesson_notes')
      .getPublicUrl(filePath);
    
    pdf_url = publicUrl;
  }

  const { error } = await supabase.from('lessons').insert({
    course_id: courseId,
    title,
    youtube_url: youtube_url || null,
    notes: notes || null,
    pdf_url,
    xp_reward,
    sort_order,
    week_number,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function updateLesson(lessonId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const youtube_url = formData.get('youtube_url') as string;
  const notes = formData.get('notes') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '20');
  const sort_order = parseInt(formData.get('sort_order') as string || '1');
  const week_number = parseInt(formData.get('week_number') as string || '1');
  const pdf_file = formData.get('pdf_file') as File | null;

  const updateData: any = {
    title,
    youtube_url: youtube_url || null,
    notes: notes || null,
    xp_reward,
    sort_order,
    week_number,
  };

  if (pdf_file && pdf_file.size > 0) {
    const fileExt = pdf_file.name.split('.').pop();
    const filePath = `notes/lesson_${courseId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('lesson_notes')
      .upload(filePath, pdf_file, { upsert: true });

    if (uploadError) return { error: `Failed to upload note: ${uploadError.message}` };

    const { data: { publicUrl } } = supabase.storage
      .from('lesson_notes')
      .getPublicUrl(filePath);
    
    updateData.pdf_url = publicUrl;
  }

  const { error } = await supabase.from('lessons').update(updateData).eq('id', lessonId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function deleteLesson(lessonId: string, courseId: string) {
  const { supabase } = await requireBuilderRole();
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  
  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

// --- ASSIGNMENT ACTIONS ---

export async function addAssignment(lessonId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const expected_output = formData.get('expected_output') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '50');
  const requires_github = formData.get('requires_github') === 'true';
  const requires_deploy = formData.get('requires_deploy') === 'true';

  if (!title) return { error: 'Assignment title is required' };

  const { error } = await supabase.from('assignments').insert({
    lesson_id: lessonId,
    title,
    type,
    description: description || null,
    expected_output: expected_output || null,
    xp_reward,
    requires_github,
    requires_deploy,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function updateAssignment(assignmentId: string, courseId: string, formData: FormData) {
  const { supabase } = await requireBuilderRole();
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const expected_output = formData.get('expected_output') as string;
  const xp_reward = parseInt(formData.get('xp_reward') as string || '50');
  const requires_github = formData.get('requires_github') === 'true';
  const requires_deploy = formData.get('requires_deploy') === 'true';

  const { error } = await supabase.from('assignments').update({
    title,
    type,
    description: description || null,
    expected_output: expected_output || null,
    xp_reward,
    requires_github,
    requires_deploy,
  }).eq('id', assignmentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}

export async function deleteAssignment(assignmentId: string, courseId: string) {
  const { supabase } = await requireBuilderRole();
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  
  if (error) return { error: error.message };

  revalidatePath(`/admin/courses/${courseId}/builder`);
  revalidatePath(`/instructor/courses/${courseId}/builder`);
  return { success: true };
}
