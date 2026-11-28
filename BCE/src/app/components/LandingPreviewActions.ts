'use server';

import { createClient as createSupabaseJs } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import type { ClubCoordinator, ClubEvent, ClubFacultyMentor } from '@/lib/club-utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 10;

function sanitizePageParams(page?: number, pageSize?: number) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(Number(page))) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(50, Math.max(1, Math.floor(Number(pageSize))))
    : DEFAULT_PAGE_SIZE;
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { page: safePage, pageSize: safeSize, from, to };
}

function normalizeDifficulty(raw: unknown): 'Easy' | 'Medium' | 'Hard' {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'HARD') return 'Hard';
  if (val === 'MEDIUM') return 'Medium';
  return 'Easy';
}

function getPublicAnonClient() {
  return createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function formatError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.details || err.hint || (typeof err === 'object' ? JSON.stringify(err) : String(err));
}

function stripPreviewHtml(raw: string | null | undefined, maxLen?: number): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/?(?:div|span|p|br|h[1-6]|ul|ol|li|strong|em|b|i|u|s|code|pre|table|thead|tbody|tr|th|td|style|script|section|article|header|footer|aside|main|nav|a|img|blockquote|hr)\b[^>]*>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&middot;/gi, '·')
    .replace(/&bull;/gi, '•')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();

  if (maxLen && text.length > maxLen) {
    text = text.slice(0, maxLen - 1).trimEnd() + '…';
  }
  return text;
}

const getCachedLandingShell = unstable_cache(
  async () => {
    const supabase = getPublicAnonClient();
    const [{ data: settings }, { data: hero }, { data: coreFeatures }, { data: galleryItems }] = await Promise.all([
      supabase.from('company_settings').select('company_name, tagline, logo_url').maybeSingle(),
      supabase
        .from('landing_content')
        .select('hero_badge, hero_heading, hero_highlight, hero_description, hero_cta_text, hero_cta_link, hero_cta_text_2, hero_cta_link_2, hero_image_url')
        .eq('id', 'default')
        .maybeSingle(),
      supabase
        .from('landing_core_features')
        .select('id, title, description, icon, image_url, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('landing_gallery')
        .select('id, image_url, title, description, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);
    return { settings, hero, coreFeatures: coreFeatures || [], galleryItems: galleryItems || [] };
  },
  ['landing-shell-v3'],
  { revalidate: 60, tags: ['landing-shell'] }
);

export async function getLandingShellData() {
  return getCachedLandingShell();
}

const getCachedClubShowcase = unstable_cache(
  async (): Promise<{
    mentors: ClubFacultyMentor[];
    coordinators: ClubCoordinator[];
    events: ClubEvent[];
  }> => {
    const supabase = getPublicAnonClient();
    const [{ data: mentors }, { data: coordinators }, { data: events }] = await Promise.all([
      supabase
        .from('club_faculty_mentors')
        .select('id, name, club_role, post, timeline, photo_url, profile_url, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('club_coordinators')
        .select('id, name, profile_url, batch_label, term_label, term_end_date, status_mode, sort_order, is_active')
        .eq('is_active', true)
        .order('term_end_date', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('club_events')
        .select('id, title, badge_label, event_date_label, venue, description, winners, image_urls, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
    ]);
    return {
      mentors: (mentors as ClubFacultyMentor[]) || [],
      coordinators: (coordinators as ClubCoordinator[]) || [],
      events: (events as ClubEvent[]) || [],
    };
  },
  ['coding-club-showcase-v2'],
  { revalidate: 60, tags: ['coding-club'] }
);

export async function getClubShowcaseData() {
  return getCachedClubShowcase();
}

const getCachedPreviewCourses = unstable_cache(
  async (page: number, limit: number, category: string) => {
    const supabase = getPublicAnonClient();

    let query = supabase
      .from('courses')
      .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count, created_by, profiles!courses_created_by_fkey(name)')
      .eq('is_published', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (category !== 'All Categories') {
      query = query.eq('difficulty', category);
    }

    query = query.range(page * limit, (page + 1) * limit - 1);
    const { data: rawData, error } = await query;
    let coursesList: any[] = (rawData as any[]) || [];

    if (error || coursesList.length === 0) {
      let fallbackQuery = supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count, created_by')
        .eq('is_published', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (category !== 'All Categories') {
        fallbackQuery = fallbackQuery.eq('difficulty', category);
      }
      fallbackQuery = fallbackQuery.range(page * limit, (page + 1) * limit - 1);

      const fallbackRes = await fallbackQuery;
      if (fallbackRes.error && coursesList.length === 0) {
        console.error('Error fetching courses:', formatError(fallbackRes.error || error));
        return { data: [], error: 'Failed to fetch courses' };
      }
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        coursesList = fallbackRes.data;
      }
    }

    const missingUserIds = Array.from(
      new Set(
        coursesList
          .filter((c: any) => (!c.profiles || !c.profiles.name) && c.created_by)
          .map((c: any) => c.created_by)
      )
    );

    const courseIds = coursesList.map((c) => c.id);
    const [profsRes, reviewsRes] = await Promise.all([
      missingUserIds.length > 0
        ? supabase.from('profiles').select('id, name').in('id', missingUserIds)
        : Promise.resolve({ data: [] as any[] }),
      courseIds.length > 0
        ? supabase
            .from('course_reviews')
            .select('course_id, rating')
            .in('course_id', courseIds)
            .eq('status', 'published')
            .eq('is_public', true)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    if (profsRes.data && profsRes.data.length > 0) {
      const profMap = new Map(profsRes.data.map((p: any) => [p.id, p.name]));
      coursesList.forEach((c: any) => {
        if (!c.profiles?.name && c.created_by && profMap.has(c.created_by)) {
          c.profiles = { name: profMap.get(c.created_by)! };
        }
      });
    }

    const ratingMap: Record<string, { averageRating: number; totalReviews: number }> = {};
    if (reviewsRes.data) {
      const aggregates: Record<string, { sum: number; count: number }> = {};
      reviewsRes.data.forEach((r: any) => {
        if (!aggregates[r.course_id]) aggregates[r.course_id] = { sum: 0, count: 0 };
        aggregates[r.course_id].sum += r.rating;
        aggregates[r.course_id].count += 1;
      });
      Object.keys(aggregates).forEach((id) => {
        const { sum, count } = aggregates[id];
        ratingMap[id] = {
          averageRating: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
          totalReviews: count,
        };
      });
    }

    const enrichedData = coursesList.map((c) => ({
      ...c,
      description: stripPreviewHtml(c.description, 260),
      averageRating: ratingMap[c.id]?.averageRating || 0,
      totalReviews: ratingMap[c.id]?.totalReviews || 0,
    }));

    return { data: enrichedData, error: null };
  },
  ['landing-preview-courses-v2'],
  { revalidate: 60 }
);

export async function getPreviewCourses(page = 0, limit = 100, category = 'All Categories') {
  return getCachedPreviewCourses(page, limit, category);
}

const getCachedCourseCategories = unstable_cache(
  async () => {
    const supabase = getPublicAnonClient();
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
    data.forEach((course) => {
      if (course.difficulty && typeof course.difficulty === 'string' && course.difficulty.trim() !== '') {
        categoriesSet.add(course.difficulty.trim());
      }
    });

    return Array.from(categoriesSet).sort();
  },
  ['landing-course-categories-v1'],
  { revalidate: 60 }
);

export async function getCourseCategories() {
  return getCachedCourseCategories();
}

const getCachedPreviewDSASheets = unstable_cache(
  async (page: number, limit: number) => {
    const supabase = getPublicAnonClient();
    const { data, error } = await supabase
      .from('coding_sheets')
      .select('id, title, description, enrollment_access, sheet_type, metadata, coding_sheet_problems(problem_id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error || !data) {
      console.error('Error fetching DSA sheets:', formatError(error));
      return { data: [], error: 'Failed to fetch DSA sheets' };
    }

    const sheetIds = data.map((s) => s.id);
    const sheetRatingMap: Record<string, { averageRating: number; totalReviews: number }> = {};
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
        Object.keys(aggregates).forEach((id) => {
          const { sum, count } = aggregates[id];
          sheetRatingMap[id] = {
            averageRating: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
            totalReviews: count,
          };
        });
      }
    }

    const enrichedData = data.map((s) => ({
      ...s,
      averageRating: sheetRatingMap[s.id]?.averageRating || 0,
      totalReviews: sheetRatingMap[s.id]?.totalReviews || 0,
    }));

    return { data: enrichedData, error: null };
  },
  ['landing-preview-sheets-v1'],
  { revalidate: 60 }
);

export async function getPreviewDSASheets(page = 0, limit = 100) {
  return getCachedPreviewDSASheets(page, limit);
}

export async function getExploreCourseDetails(courseId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  if (!UUID_RE.test(courseId)) {
    return { data: null, error: 'Course not found' };
  }
  const safe = sanitizePageParams(page, pageSize);
  return getCachedExploreCourseDetails(courseId, safe.page, safe.pageSize);
}

export async function getExploreCourseLessonsPage(courseId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  if (!UUID_RE.test(courseId)) {
    return { data: null, error: 'Course not found' };
  }
  const safe = sanitizePageParams(page, pageSize);
  return getCachedExploreCourseLessonsPage(courseId, safe.page, safe.pageSize);
}

async function fetchCourseLessonsSlice(adminClient: any, courseId: string, from: number, to: number) {
  const { data: lessons, count } = await adminClient
    .from('lessons')
    .select('id, title, notes, xp_reward, sort_order, week_number, pdf_url, youtube_url', { count: 'exact' })
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .range(from, to);

  const items = (lessons || []).map((l: any) => ({
    id: l.id,
    title: l.title,
    notes: stripPreviewHtml(l.notes, 220),
    xpReward: l.xp_reward,
    sortOrder: l.sort_order,
    weekNumber: l.week_number,
    hasPdf: !!l.pdf_url,
    hasVideo: !!l.youtube_url,
  }));

  return { items, total: typeof count === 'number' ? count : items.length };
}

const getCachedExploreCourseLessonsPage = unstable_cache(
  async (courseId: string, page: number, pageSize: number) => {
    try {
      const adminClient = await createAdminClient();
      const { from, to } = sanitizePageParams(page, pageSize);
      const { items, total } = await fetchCourseLessonsSlice(adminClient, courseId, from, to);
      return {
        data: {
          curriculum: items,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
          },
        },
        error: null,
      };
    } catch {
      return { data: null, error: 'Failed to load lessons page' };
    }
  },
  ['explore-course-lessons-page-v1'],
  { revalidate: 120 }
);

const getCachedExploreCourseDetails = unstable_cache(
  async (courseId: string, page: number, pageSize: number) => {
  try {
    const adminClient = await createAdminClient();
    const { from, to } = sanitizePageParams(page, pageSize);

    // 1. Course Details & Creator Profile (enforce published & not deleted)
    let course: any = null;
    const { data: primaryCourse, error: cErr } = await adminClient
      .from('courses')
      .select('id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, is_published, is_deleted, created_by, created_at, profiles!courses_created_by_fkey(name, avatar_url)')
      .eq('id', courseId)
      .eq('is_published', true)
      .eq('is_deleted', false)
      .single();

    if (primaryCourse && !cErr) {
      course = primaryCourse;
    } else {
      const { data: rawCourse } = await adminClient
        .from('courses')
        .select('id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, is_published, is_deleted, created_by, created_at')
        .eq('id', courseId)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .single();
      if (!rawCourse) return { data: null, error: 'Course not found' };
      const { data: prof } = await adminClient
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', rawCourse.created_by)
        .maybeSingle();
      course = { ...rawCourse, profiles: prof };
    }

    // Fetch course explore slices in parallel (1st page of lessons only + assignments via join)
    const [
      { data: coInstructors },
      lessonsSlice,
      { data: assignmentsData },
      { data: notices },
      { data: polls },
      { data: doubts, count: doubtsCount },
      { data: students, count: enrolledCount },
      { data: reviews },
    ] = await Promise.all([
      adminClient
        .from('course_instructors')
        .select('instructor_id, profiles(name, avatar_url)')
        .eq('course_id', courseId),
      fetchCourseLessonsSlice(adminClient, courseId, from, to),
      adminClient
        .from('assignments')
        .select('id, lesson_id, type, title, description, xp_reward, lessons!inner(course_id)')
        .eq('lessons.course_id', courseId)
        .limit(30),
      adminClient
        .from('course_notices')
        .select('id, title, content, created_at, profiles:created_by(name)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(10),
      adminClient
        .from('course_polls')
        .select('id, question, is_multiple_choice, expires_at, created_at, course_poll_options(id, option_text)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(5),
      adminClient
        .from('doubts')
        .select('id, title, description, status, likes_count, created_at, profiles:user_id(name)', { count: 'exact' })
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(10),
      adminClient
        .from('enrollments')
        .select('id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('course_id', courseId)
        .eq('status', 'approved')
        .order('enrolled_at', { ascending: false })
        .limit(16),
      adminClient
        .from('course_reviews')
        .select('id, rating, review_text, created_at, profiles(name, avatar_url)')
        .eq('course_id', courseId)
        .eq('status', 'published')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const assignments = assignmentsData || [];

    let averageRating = 0;
    const totalReviews = (reviews || []).length;
    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (reviews && reviews.length > 0) {
      let sum = 0;
      reviews.forEach((r: any) => {
        sum += r.rating;
        if (ratingDistribution[r.rating] !== undefined) {
          ratingDistribution[r.rating]++;
        }
      });
      averageRating = parseFloat((sum / reviews.length).toFixed(1));
    }

    const totalLessons = lessonsSlice.total || course?.lesson_count || lessonsSlice.items.length;

    return {
      data: {
        course: {
          ...course,
          description: stripPreviewHtml(course.description),
        },
        coInstructors: (coInstructors || []).map((ci: any) => ci.profiles).filter(Boolean),
        curriculum: lessonsSlice.items,
        lessonPagination: {
          page,
          pageSize,
          total: totalLessons,
          totalPages: Math.max(1, Math.ceil(totalLessons / pageSize)),
        },
        assignments: assignments.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          description: stripPreviewHtml(a.description, 180),
          xpReward: a.xp_reward
        })),
        notices: (notices || []).map(n => ({
          id: n.id,
          title: n.title,
          content: stripPreviewHtml(n.content, 360),
          createdAt: n.created_at,
          authorName: (n.profiles as any)?.name || 'Instructor'
        })),
        polls: (polls || []).map(p => ({
          id: p.id,
          question: p.question,
          isMultipleChoice: p.is_multiple_choice,
          expiresAt: p.expires_at,
          options: (p.course_poll_options || []).map((opt: any) => ({
            id: opt.id,
            text: opt.option_text
          }))
        })),
        doubts: {
          total: doubtsCount || (doubts || []).length,
          items: (doubts || []).map(d => ({
            id: d.id,
            title: d.title,
            description: stripPreviewHtml(d.description, 200),
            status: d.status,
            likesCount: d.likes_count || 0,
            createdAt: d.created_at,
            authorName: (d.profiles as any)?.name || 'Student'
          }))
        },
        students: {
          total: enrolledCount || (students || []).length,
          sample: (students || []).map((s: any) => ({
            id: s.profiles?.id || s.id,
            name: s.profiles?.name || 'Student',
            avatarUrl: s.profiles?.avatar_url || null,
          }))
        },
        reviews: {
          averageRating,
          totalReviews,
          ratingDistribution,
          items: (reviews || []).map(r => ({
            id: r.id,
            rating: r.rating,
            reviewText: r.review_text,
            createdAt: r.created_at,
            authorName: (r.profiles as any)?.name || 'Student',
            authorAvatar: (r.profiles as any)?.avatar_url || null
          }))
        }
      },
      error: null
    };
  } catch {
    return { data: null, error: 'Failed to fetch course explore details' };
  }
  },
  ['explore-course-details-v3'],
  { revalidate: 120 }
);

async function fetchSheetProblemsPageHelper(
  adminClient: any,
  sheetId: string,
  sheetType: string,
  page: number,
  pageSize: number,
  includeDifficultyCounts: boolean
) {
  const { from, to } = sanitizePageParams(page, pageSize);
  const difficultyStats = { Easy: 0, Medium: 0, Hard: 0, Total: 0 };

  const countHeadDifficulties = async (tableName: string) => {
    const [easyRes, medRes, hardRes] = await Promise.all([
      adminClient.from(tableName).select('id', { count: 'exact', head: true }).eq('sheet_id', sheetId).eq('difficulty', 'EASY'),
      adminClient.from(tableName).select('id', { count: 'exact', head: true }).eq('sheet_id', sheetId).eq('difficulty', 'MEDIUM'),
      adminClient.from(tableName).select('id', { count: 'exact', head: true }).eq('sheet_id', sheetId).eq('difficulty', 'HARD'),
    ]);
    difficultyStats.Easy = easyRes.count || 0;
    difficultyStats.Medium = medRes.count || 0;
    difficultyStats.Hard = hardRes.count || 0;
  };

  let problems: any[] = [];
  let total = 0;

  if (sheetType === 'SQL') {
    const [{ data, count }] = await Promise.all([
      adminClient
        .from('coding_sheet_sql_questions')
        .select('id, question_number, type, section, difficulty, question', { count: 'exact' })
        .eq('sheet_id', sheetId)
        .order('question_number', { ascending: true })
        .range(from, to),
      includeDifficultyCounts ? countHeadDifficulties('coding_sheet_sql_questions') : Promise.resolve(),
    ]);
    total = typeof count === 'number' ? count : (data || []).length;
    problems = (data || []).map((q: any) => ({
      id: q.id,
      title: `Q${q.question_number}. ${stripPreviewHtml(q.question, 220)}`,
      difficulty: normalizeDifficulty(q.difficulty),
      external_platform: q.type,
      tags: [q.section].filter(Boolean),
      order_index: (q.question_number || 1) - 1,
    }));
  } else if (sheetType === 'APTITUDE' || sheetType === 'TCS_PREP') {
    const tableName =
      sheetType === 'APTITUDE' ? 'coding_sheet_aptitude_questions' : 'coding_sheet_tcs_questions';
    const [{ data, count }] = await Promise.all([
      adminClient
        .from(tableName)
        .select('id, question_number, chapter_number, chapter_title, category, level_label, difficulty, question', { count: 'exact' })
        .eq('sheet_id', sheetId)
        .order('question_number', { ascending: true })
        .range(from, to),
      includeDifficultyCounts ? countHeadDifficulties(tableName) : Promise.resolve(),
    ]);
    total = typeof count === 'number' ? count : (data || []).length;
    problems = (data || []).map((q: any) => ({
      id: q.id,
      title: `Q${q.question_number}. ${stripPreviewHtml(q.question, 220)}`,
      difficulty: normalizeDifficulty(q.difficulty),
      external_platform: q.category,
      tags: [`Ch ${q.chapter_number}: ${q.chapter_title}`, q.level_label].filter(Boolean),
      order_index: (q.question_number || 1) - 1,
    }));
  } else if (sheetType === 'ROADMAP') {
    const [{ data, count }] = await Promise.all([
      adminClient
        .from('coding_sheet_roadmap_problems')
        .select('id, problem_code, order_index, level_number, topic, title, difficulty, company_tags', { count: 'exact' })
        .eq('sheet_id', sheetId)
        .order('order_index', { ascending: true })
        .range(from, to),
      includeDifficultyCounts ? countHeadDifficulties('coding_sheet_roadmap_problems') : Promise.resolve(),
    ]);
    total = typeof count === 'number' ? count : (data || []).length;
    problems = (data || []).map((p: any) => ({
      id: p.id,
      title: `${p.problem_code} · ${p.title}`,
      difficulty: normalizeDifficulty(p.difficulty),
      external_platform: `Level ${p.level_number} • ${p.topic}`,
      tags: Array.isArray(p.company_tags) ? p.company_tags : [],
      order_index: (p.order_index || 1) - 1,
    }));
  } else {
    const { data, count } = await adminClient
      .from('coding_sheet_problems')
      .select('order_index, coding_problems(id, title, difficulty, external_platform, tags, external_url)', { count: 'exact' })
      .eq('sheet_id', sheetId)
      .order('order_index', { ascending: true })
      .range(from, to);

    total = typeof count === 'number' ? count : (data || []).length;
    problems = (data || [])
      .filter((p: any) => p.coding_problems)
      .map((p: any) => ({
        ...p.coding_problems,
        difficulty: normalizeDifficulty(p.coding_problems?.difficulty),
        order_index: p.order_index,
      }));

    if (includeDifficultyCounts) {
      if (total <= pageSize) {
        problems.forEach((p: any) => {
          difficultyStats[normalizeDifficulty(p.difficulty)]++;
        });
      } else {
        const { data: diffRows } = await adminClient
          .from('coding_sheet_problems')
          .select('coding_problems(difficulty)')
          .eq('sheet_id', sheetId);
        (diffRows || []).forEach((row: any) => {
          if (row.coding_problems) {
            difficultyStats[normalizeDifficulty(row.coding_problems.difficulty)]++;
          }
        });
      }
    }
  }

  difficultyStats.Total = total;
  return {
    problems,
    difficultyStats,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getExploreSheetDetails(sheetId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  if (!UUID_RE.test(sheetId)) {
    return { data: null, error: 'Sheet not found' };
  }
  const safe = sanitizePageParams(page, pageSize);
  return getCachedExploreSheetDetails(sheetId, safe.page, safe.pageSize);
}

export async function getExploreSheetProblemsPage(sheetId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  if (!UUID_RE.test(sheetId)) {
    return { data: null, error: 'Sheet not found' };
  }
  const safe = sanitizePageParams(page, pageSize);
  return getCachedExploreSheetProblemsPage(sheetId, safe.page, safe.pageSize);
}

const getCachedExploreSheetProblemsPage = unstable_cache(
  async (sheetId: string, page: number, pageSize: number) => {
    try {
      const adminClient = await createAdminClient();
      const { data: sheet, error: sErr } = await adminClient
        .from('coding_sheets')
        .select('id, sheet_type')
        .eq('id', sheetId)
        .eq('is_public', true)
        .single();

      if (sErr || !sheet) return { data: null, error: 'Sheet not found' };

      const sheetType = (sheet as any).sheet_type || 'DSA';
      const result = await fetchSheetProblemsPageHelper(adminClient, sheetId, sheetType, page, pageSize, false);
      return {
        data: {
          problems: result.problems,
          pagination: result.pagination,
        },
        error: null,
      };
    } catch {
      return { data: null, error: 'Failed to load problems page' };
    }
  },
  ['explore-sheet-problems-page-v1'],
  { revalidate: 120 }
);

const getCachedExploreSheetDetails = unstable_cache(
  async (sheetId: string, page: number, pageSize: number) => {
  try {
    const adminClient = await createAdminClient();

    // 1. Sheet info (only allow exploring public sheets)
    const { data: sheet, error: sErr } = await adminClient
      .from('coding_sheets')
      .select('id, title, description, is_public, enrollment_access, youtube_url, attachment_type, attachment_url, sheet_type, metadata, created_at, profiles:created_by(name)')
      .eq('id', sheetId)
      .eq('is_public', true)
      .single();

    if (sErr || !sheet) return { data: null, error: 'Sheet not found' };

    const sheetType = (sheet as any).sheet_type || 'DSA';

    const [
      { data: statsRaw },
      { data: sheetEnrollments, count: enrolledCount },
      { data: reviews },
      problemsRes,
    ] = await Promise.all([
      adminClient.rpc('get_sheet_community_stats', { p_sheet_id: sheetId, p_sheet_type: sheetType, p_limit: 15 } as any),
      adminClient
        .from('coding_sheet_enrollments')
        .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
        .eq('sheet_id', sheetId)
        .order('enrolled_at', { ascending: false })
        .limit(16),
      adminClient
        .from('sheet_reviews')
        .select('id, rating, review_text, created_at, profiles(name, avatar_url)')
        .eq('sheet_id', sheetId)
        .eq('status', 'published')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20),
      fetchSheetProblemsPageHelper(adminClient, sheetId, sheetType, page, pageSize, true),
    ]);

    const solvers = (Array.isArray((statsRaw as any)?.top_solvers) ? (statsRaw as any).top_solvers : []).map((s: any) => ({
      name: s.name || 'Learner',
      avatarUrl: s.avatar_url || null,
      solvedCount: Number(s.solved_count || 0),
    }));

    let averageRating = 0;
    const totalReviews = (reviews || []).length;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r: any) => acc + r.rating, 0);
      averageRating = parseFloat((sum / reviews.length).toFixed(1));
    }

    return {
      data: {
        sheet: {
          ...sheet,
          description: stripPreviewHtml((sheet as any).description),
          creatorName: (sheet.profiles as any)?.name || 'Instructor'
        },
        problems: problemsRes.problems,
        pagination: problemsRes.pagination,
        difficultyStats: problemsRes.difficultyStats,
        students: {
          total: enrolledCount || (sheetEnrollments || []).length,
          sample: (sheetEnrollments || []).map((e: any) => ({
            id: e.profiles?.id || e.user_id,
            name: e.profiles?.name || 'Learner',
            avatarUrl: e.profiles?.avatar_url || null,
          }))
        },
        solvers,
        reviews: {
          averageRating,
          totalReviews,
          items: (reviews || []).map(r => ({
            id: r.id,
            rating: r.rating,
            reviewText: r.review_text,
            createdAt: r.created_at,
            authorName: (r.profiles as any)?.name || 'Coder',
            authorAvatar: (r.profiles as any)?.avatar_url || null
          }))
        }
      },
      error: null
    };
  } catch {
    return { data: null, error: 'Failed to fetch sheet explore details' };
  }
  },
  ['explore-sheet-details-v3'],
  { revalidate: 120 }
);
