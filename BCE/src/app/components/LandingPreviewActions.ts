'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPreviewCourses(page = 0, limit = 6, category = 'All Categories') {
  const supabase = await createClient();
  
  let query = supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count')
    .eq('is_published', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Filter by difficulty category if not "All Categories"
  if (category !== 'All Categories') {
    query = query.eq('difficulty', category);
  }

  query = query.range(page * limit, (page + 1) * limit - 1);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching courses:', error);
    return { data: [], error: error.message };
  }
  return { data: data || [], error: null };
}

export async function getCourseCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('difficulty')
    .eq('is_published', true)
    .eq('is_deleted', false);

  if (error || !data) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const categoriesSet = new Set<string>();
  data.forEach(course => {
    if (course.difficulty && typeof course.difficulty === 'string' && course.difficulty.trim() !== '') {
      categoriesSet.add(course.difficulty.trim());
    }
  });

  return Array.from(categoriesSet).sort();
}

export async function getPreviewDSASheets(page = 0, limit = 6) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coding_sheets')
    .select('id, title, description, enrollment_access, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching DSA sheets:', error);
    return { data: [], error: error.message };
  }
  return { data: data || [], error: null };
}
