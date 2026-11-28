import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course } from '@/types';

const COURSE_CARD_COLUMNS_WITH_PROFILE =
  'id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, is_published, is_deleted, created_at, created_by, profiles!courses_created_by_fkey(name)';

const COURSE_CARD_COLUMNS =
  'id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, is_published, is_deleted, created_at, created_by';

export interface CourseCardQueryOptions {
  courseIds?: string[];
  offset?: number;
  limit?: number;
}

export interface CourseCardQueryResult {
  courses: Course[];
  hasMore: boolean;
}

/**
 * Fetches lightweight card-level course metadata without loading lessons or assignments.
 * Falls back to querying without the profile join if the PostgREST relation cache is stale.
 */
export async function queryCourseCards(
  supabase: SupabaseClient,
  options: CourseCardQueryOptions = {}
): Promise<CourseCardQueryResult> {
  const { courseIds, offset, limit } = options;

  if (courseIds && courseIds.length === 0) {
    return { courses: [], hasMore: false };
  }

  const buildQuery = (columns: string) => {
    let q = supabase
      .from('courses')
      .select(columns)
      .eq('is_published', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (courseIds) {
      q = q.in('id', courseIds);
    }

    if (typeof offset === 'number' && typeof limit === 'number') {
      q = q.range(offset, offset + limit);
    }

    return q;
  };

  let { data, error } = await buildQuery(COURSE_CARD_COLUMNS_WITH_PROFILE);

  if (error) {
    console.warn('[queryCourseCards] Profile join query failed, retrying without join:', error.message);
    const fallback = await buildQuery(COURSE_CARD_COLUMNS);
    data = fallback.data;
    error = fallback.error;
    if (error) {
      console.error('[queryCourseCards] Fallback query failed:', error.message);
      return { courses: [], hasMore: false };
    }
  }

  const rows = ((data as unknown) as Course[]) || [];

  if (typeof limit === 'number' && rows.length > limit) {
    return {
      courses: rows.slice(0, limit),
      hasMore: true,
    };
  }

  return {
    courses: rows,
    hasMore: false,
  };
}

