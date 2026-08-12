'use server';

import { revalidatePath } from 'next/cache';
import { getCodeArenaActor, slugifyProblem } from './server';

const instructorError = { error: 'Instructor access is required.' };

export async function saveCodingProblem(formData: FormData) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return instructorError;
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  if (!title || !description) return { error: 'Title and description are required.' };
  const id = String(formData.get('id') || '');
  const data = {
    title, slug: slugifyProblem(String(formData.get('slug') || title)), description,
    difficulty: String(formData.get('difficulty') || 'EASY'),
    tags: String(formData.get('tags') || '').split(',').map(x => x.trim()).filter(Boolean),
    constraints: String(formData.get('constraints') || '') || null,
    input_format: String(formData.get('input_format') || '') || null,
    output_format: String(formData.get('output_format') || '') || null,
    explanation: String(formData.get('explanation') || '') || null,
    time_limit_ms: Math.max(1, Number(formData.get('time_limit_ms') || 2000)),
    memory_limit_mb: Math.max(1, Number(formData.get('memory_limit_mb') || 256)),
    is_published: formData.get('is_published') === 'true',
  };
  const query = id ? supabase.from('coding_problems').update(data).eq('id', id).eq('created_by', user.id) : supabase.from('coding_problems').insert({ ...data, created_by: user.id });
  const { error } = await query;
  if (error) return { error: error.code === '23505' ? 'A problem with this slug already exists.' : error.message };
  revalidatePath('/instructor/code-arena'); revalidatePath('/code-arena');
  return { success: true };
}

export async function deleteCodingProblem(id: string) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return instructorError;
  const { error } = await supabase.from('coding_problems').delete().eq('id', id).eq('created_by', user.id);
  if (error) return { error: error.message };
  revalidatePath('/instructor/code-arena'); return { success: true };
}

export async function duplicateCodingProblem(id: string) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return instructorError;
  const { data: source, error } = await supabase.from('coding_problems').select('*').eq('id', id).eq('created_by', user.id).single();
  if (error || !source) return { error: 'Problem not found.' };
  const { id: _id, created_at: _created, updated_at: _updated, ...copy } = source;
  const { error: insertError } = await supabase.from('coding_problems').insert({ ...copy, title: `${source.title} (Copy)`, slug: `${source.slug}-copy-${Date.now()}`, is_published: false, created_by: user.id });
  if (insertError) return { error: insertError.message };
  revalidatePath('/instructor/code-arena'); return { success: true };
}

export async function saveTestCase(formData: FormData) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return instructorError;
  const problemId = String(formData.get('problem_id') || '');
  const { data: problem } = await supabase.from('coding_problems').select('id').eq('id', problemId).eq('created_by', user.id).single();
  if (!problem) return { error: 'Problem not found.' };
  const data = { input: String(formData.get('input') || ''), expected_output: String(formData.get('expected_output') || ''), is_hidden: formData.get('is_hidden') === 'true', sample_name: String(formData.get('sample_name') || '') || null, order_index: Number(formData.get('order_index') || 0) };
  if (!data.input || !data.expected_output) return { error: 'Input and expected output are required.' };
  const id = String(formData.get('id') || '');
  const { error } = id ? await supabase.from('coding_problem_test_cases').update(data).eq('id', id) : await supabase.from('coding_problem_test_cases').insert({ ...data, problem_id: problemId });
  if (error) return { error: error.message };
  revalidatePath(`/instructor/code-arena/${problemId}`); return { success: true };
}

export async function deleteTestCase(id: string, problemId: string) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return instructorError;
  const { error } = await supabase.from('coding_problem_test_cases').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/instructor/code-arena/${problemId}`); return { success: true };
}
