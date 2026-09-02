'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPreviewCourses(page = 0, limit = 6, category = 'All Categories') {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count')
    .eq('is_published', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching courses:', error);
    return { data: [], error: error.message };
  }

  let filtered = data || [];

  if (category !== 'All Categories') {
    filtered = filtered.filter(course => {
      if (!course.tags) return false;
      if (Array.isArray(course.tags)) {
        return course.tags.some(tag => typeof tag === 'string' && tag.trim() === category);
      }
      if (typeof course.tags === 'string') {
        try {
          const parsed = JSON.parse(course.tags);
          if (Array.isArray(parsed)) return parsed.some(tag => typeof tag === 'string' && tag.trim() === category);
        } catch (e) {
          return (course.tags as string).split(',').some(tag => tag.trim() === category);
        }
      }
      return false;
    });
  }

  const start = page * limit;
  const sliced = filtered.slice(start, start + limit);

  return { data: sliced, error: null };
}

export async function getCourseCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('tags')
    .eq('is_published', true)
    .eq('is_deleted', false);

  if (error || !data) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const tagsSet = new Set<string>();
  data.forEach(course => {
    if (!course.tags) return;
    
    if (Array.isArray(course.tags)) {
      course.tags.forEach(tag => {
        if (typeof tag === 'string' && tag.trim() !== '') {
          tagsSet.add(tag.trim());
        }
      });
    } else if (typeof course.tags === 'string') {
      try {
        const parsed = JSON.parse(course.tags);
        if (Array.isArray(parsed)) {
          parsed.forEach(tag => {
            if (typeof tag === 'string' && tag.trim() !== '') {
              tagsSet.add(tag.trim());
            }
          });
        } else {
          tagsSet.add((course.tags as string).trim());
        }
      } catch (e) {
        const strTags = (course.tags as string).split(',');
        strTags.forEach(tag => {
          if (tag.trim() !== '') tagsSet.add(tag.trim());
        });
      }
    }
  });

  return Array.from(tagsSet).sort();
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
