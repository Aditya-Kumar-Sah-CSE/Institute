'use server';

import { createClient } from '@/lib/supabase/server';
import { queryCourseCards } from '@/features/courses/lib/courseQueries';
import { getBatchCourseRatingStats } from './reviews';
import type { Course } from '@/types';

export interface FetchCatalogCoursesResult {
  courses: Course[];
  ratingStatsMap: Record<string, { averageRating: number; totalReviews: number }>;
  hasMore: boolean;
  error?: string;
}

/**
 * Fetches paginated published course cards and their batch rating stats on demand
 * when the user switches to the All Courses catalog view.
 */
export async function fetchAllCourseCardsAction(
  offset = 0,
  limit = 12
): Promise<FetchCatalogCoursesResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { courses: [], ratingStatsMap: {}, hasMore: false, error: 'Unauthorized' };
  }

  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));

  const { courses, hasMore } = await queryCourseCards(supabase, {
    offset: safeOffset,
    limit: safeLimit,
  });

  const courseIds = courses.map((c) => c.id).filter(Boolean);
  const ratingStatsMap = courseIds.length > 0 ? await getBatchCourseRatingStats(courseIds) : {};

  return { courses, ratingStatsMap, hasMore };
}

