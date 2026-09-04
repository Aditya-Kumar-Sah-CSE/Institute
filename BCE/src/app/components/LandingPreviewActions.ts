'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPreviewCourses(page = 0, limit = 100, category = 'All Categories') {
  const supabase = await createClient();
  
  let query = supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count, instructor_name, co_instructors, profiles:created_by(name)')
    .eq('is_published', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Filter by difficulty category if not "All Categories"
  if (category !== 'All Categories') {
    query = query.eq('difficulty', category);
  }

  query = query.range(page * limit, (page + 1) * limit - 1);
  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching courses:', error);
    return { data: [], error: error?.message || 'Error' };
  }

  // Fetch rating stats for these courses
  const courseIds = data.map(c => c.id);
  let ratingMap: Record<string, { averageRating: number; totalReviews: number }> = {};
  if (courseIds.length > 0) {
    const { data: reviews } = await supabase
      .from('course_reviews')
      .select('course_id, rating')
      .in('course_id', courseIds)
      .eq('status', 'published')
      .eq('is_public', true);

    if (reviews) {
      const aggregates: Record<string, { sum: number; count: number }> = {};
      reviews.forEach((r: any) => {
        if (!aggregates[r.course_id]) aggregates[r.course_id] = { sum: 0, count: 0 };
        aggregates[r.course_id].sum += r.rating;
        aggregates[r.course_id].count += 1;
      });
      Object.keys(aggregates).forEach(id => {
        const { sum, count } = aggregates[id];
        ratingMap[id] = {
          averageRating: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
          totalReviews: count
        };
      });
    }
  }

  const enrichedData = data.map(c => ({
    ...c,
    averageRating: ratingMap[c.id]?.averageRating || 0,
    totalReviews: ratingMap[c.id]?.totalReviews || 0
  }));

  return { data: enrichedData, error: null };
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

export async function getPreviewDSASheets(page = 0, limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coding_sheets')
    .select('id, title, description, enrollment_access, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error || !data) {
    console.error('Error fetching DSA sheets:', error);
    return { data: [], error: error?.message || 'Error' };
  }

  // Fetch rating stats for these sheets
  const sheetIds = data.map(s => s.id);
  let sheetRatingMap: Record<string, { averageRating: number; totalReviews: number }> = {};
  if (sheetIds.length > 0) {
    const { data: reviews } = await supabase
      .from('sheet_reviews')
      .select('sheet_id, rating')
      .in('sheet_id', sheetIds)
      .eq('status', 'published')
      .eq('is_public', true);

    if (reviews) {
      const aggregates: Record<string, { sum: number; count: number }> = {};
      reviews.forEach((r: any) => {
        if (!aggregates[r.sheet_id]) aggregates[r.sheet_id] = { sum: 0, count: 0 };
        aggregates[r.sheet_id].sum += r.rating;
        aggregates[r.sheet_id].count += 1;
      });
      Object.keys(aggregates).forEach(id => {
        const { sum, count } = aggregates[id];
        sheetRatingMap[id] = {
          averageRating: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
          totalReviews: count
        };
      });
    }
  }

  const enrichedData = data.map(s => ({
    ...s,
    averageRating: sheetRatingMap[s.id]?.averageRating || 0,
    totalReviews: sheetRatingMap[s.id]?.totalReviews || 0
  }));

  return { data: enrichedData, error: null };
}
