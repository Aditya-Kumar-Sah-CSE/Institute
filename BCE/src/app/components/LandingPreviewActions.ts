'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

function formatError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.details || err.hint || (typeof err === 'object' ? JSON.stringify(err) : String(err));
}

export async function getPreviewCourses(page = 0, limit = 100, category = 'All Categories') {
  const supabase = await createClient();
  
  let query = supabase
    .from('courses')
    .select('id, title, description, thumbnail_url, difficulty, tags, lesson_count, created_by, profiles!courses_created_by_fkey(name)')
    .eq('is_published', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Filter by difficulty category if not "All Categories"
  if (category !== 'All Categories') {
    query = query.eq('difficulty', category);
  }

  query = query.range(page * limit, (page + 1) * limit - 1);
  const { data: rawData, error } = await query;
  let coursesList: any[] = (rawData as any[]) || [];
  
  if (error || coursesList.length === 0) {
    // Fallback: Query without join in case foreign key relationship alias cache fails
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

  // Hydrate missing profile names via created_by if needed
  const missingUserIds = Array.from(new Set(
    coursesList
      .filter((c: any) => (!c.profiles || !c.profiles.name) && c.created_by)
      .map((c: any) => c.created_by)
  ));

  if (missingUserIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', missingUserIds);

    if (profs) {
      const profMap = new Map(profs.map(p => [p.id, p.name]));
      coursesList.forEach((c: any) => {
        if (!c.profiles?.name && c.created_by && profMap.has(c.created_by)) {
          c.profiles = { name: profMap.get(c.created_by)! };
        }
      });
    }
  }

  // Fetch rating stats for these courses
  const courseIds = coursesList.map(c => c.id);
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

  const enrichedData = coursesList.map(c => ({
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
    console.error('Error fetching DSA sheets:', formatError(error));
    return { data: [], error: 'Failed to fetch DSA sheets' };
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

export async function getExploreCourseDetails(courseId: string) {
  try {
    const adminClient = await createAdminClient();

    // 1. Course Details & Creator Profile
    let course: any = null;
    const { data: primaryCourse, error: cErr } = await adminClient
      .from('courses')
      .select('id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, created_by, created_at, profiles!courses_created_by_fkey(name, avatar_url)')
      .eq('id', courseId)
      .single();

    if (primaryCourse && !cErr) {
      course = primaryCourse;
    } else {
      const { data: rawCourse } = await adminClient
        .from('courses')
        .select('id, title, description, difficulty, thumbnail_url, tags, total_xp, lesson_count, created_by, created_at')
        .eq('id', courseId)
        .single();
      if (!rawCourse) return { data: null, error: 'Course not found' };
      const { data: prof } = await adminClient
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', rawCourse.created_by)
        .maybeSingle();
      course = { ...rawCourse, profiles: prof };
    }

    // 2. Co-instructors if any
    const { data: coInstructors } = await adminClient
      .from('course_instructors')
      .select('instructor_id, profiles(name, avatar_url)')
      .eq('course_id', courseId);

    // 3. Lessons / Curriculum
    const { data: lessons } = await adminClient
      .from('lessons')
      .select('id, title, notes, xp_reward, sort_order, week_number, pdf_url, youtube_url')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });

    // 4. Assignments / MCQs in course
    const lessonIds = (lessons || []).map(l => l.id);
    let assignments: any[] = [];
    if (lessonIds.length > 0) {
      const { data: asgData } = await adminClient
        .from('assignments')
        .select('id, lesson_id, type, title, description, xp_reward')
        .in('lesson_id', lessonIds);
      assignments = asgData || [];
    }

    // 5. Course Notices
    const { data: notices } = await adminClient
      .from('course_notices')
      .select('id, title, content, created_at, profiles:created_by(name)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 6. Course Polls
    const { data: polls } = await adminClient
      .from('course_polls')
      .select('id, question, is_multiple_choice, expires_at, created_at, course_poll_options(id, option_text)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 7. Doubts Preview
    const { data: doubts, count: doubtsCount } = await adminClient
      .from('doubts')
      .select('id, title, description, status, likes_count, created_at, profiles:user_id(name)', { count: 'exact' })
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
      .limit(10);

    // 8. Enrolled Students
    const { data: students, count: enrolledCount } = await adminClient
      .from('enrollments')
      .select('id, enrolled_at, profiles(id, name, avatar_url, institute_id)', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('status', 'approved')
      .order('enrolled_at', { ascending: false })
      .limit(24);

    // 9. Course Reviews & Rating
    const { data: reviews } = await adminClient
      .from('course_reviews')
      .select('id, rating, review_text, created_at, profiles(name, avatar_url)')
      .eq('course_id', courseId)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

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

    return {
      data: {
        course,
        coInstructors: (coInstructors || []).map((ci: any) => ci.profiles).filter(Boolean),
        curriculum: (lessons || []).map(l => ({
          id: l.id,
          title: l.title,
          notes: l.notes,
          xpReward: l.xp_reward,
          sortOrder: l.sort_order,
          weekNumber: l.week_number,
          hasPdf: !!l.pdf_url,
          hasVideo: !!l.youtube_url,
        })),
        assignments: assignments.map(a => ({
          id: a.id,
          title: a.title,
          type: a.type,
          description: a.description,
          xpReward: a.xp_reward
        })),
        notices: (notices || []).map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
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
            description: d.description,
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
            instituteId: s.profiles?.institute_id || null,
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
  } catch (err: any) {
    console.error('getExploreCourseDetails error:', err);
    return { data: null, error: err.message || 'Failed to fetch course explore details' };
  }
}

export async function getExploreSheetDetails(sheetId: string) {
  try {
    const adminClient = await createAdminClient();

    // 1. Sheet info
    const { data: sheet, error: sErr } = await adminClient
      .from('coding_sheets')
      .select('id, title, description, enrollment_access, youtube_url, attachment_type, attachment_url, created_at, profiles:created_by(name)')
      .eq('id', sheetId)
      .single();

    if (sErr || !sheet) return { data: null, error: 'Sheet not found' };

    // 2. Problems
    const { data: problemsData } = await adminClient
      .from('coding_sheet_problems')
      .select('order_index, coding_problems(id, title, difficulty, external_platform, tags, external_url)')
      .eq('sheet_id', sheetId)
      .order('order_index', { ascending: true });

    const problems = (problemsData || []).map((p: any) => ({
      ...p.coding_problems,
      order_index: p.order_index
    }));

    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0, Total: problems.length };
    problems.forEach((p: any) => {
      const diff = (p.difficulty || 'Easy').trim();
      if (diff === 'Easy' || diff === 'Medium' || diff === 'Hard') {
        difficultyStats[diff as 'Easy' | 'Medium' | 'Hard']++;
      } else {
        difficultyStats.Easy++;
      }
    });

    // 3. Enrolled students
    const { data: sheetEnrollments, count: enrolledCount } = await adminClient
      .from('coding_sheet_enrollments')
      .select('user_id, enrolled_at, profiles(id, name, avatar_url)', { count: 'exact' })
      .eq('sheet_id', sheetId)
      .order('enrolled_at', { ascending: false })
      .limit(24);

    // 4. Solvers leaderboard
    const problemIds = problems.map((p: any) => p.id).filter(Boolean);
    let solvers: { name: string; avatarUrl: string | null; solvedCount: number }[] = [];
    if (problemIds.length > 0) {
      const { data: acceptedSubs } = await adminClient
        .from('coding_submissions')
        .select('student_id, problem_id, profiles!coding_submissions_student_id_fkey(name, avatar_url)')
        .in('problem_id', problemIds)
        .eq('status', 'ACCEPTED');

      if (acceptedSubs && acceptedSubs.length > 0) {
        const solverMap = new Map<string, { name: string; avatarUrl: string | null; problemSet: Set<string> }>();
        acceptedSubs.forEach((sub: any) => {
          const studentId = sub.student_id;
          if (!solverMap.has(studentId)) {
            solverMap.set(studentId, {
              name: sub.profiles?.name || 'Anonymous Coder',
              avatarUrl: sub.profiles?.avatar_url || null,
              problemSet: new Set()
            });
          }
          solverMap.get(studentId)!.problemSet.add(sub.problem_id);
        });

        solvers = Array.from(solverMap.values())
          .map(s => ({
            name: s.name,
            avatarUrl: s.avatarUrl,
            solvedCount: s.problemSet.size
          }))
          .sort((a, b) => b.solvedCount - a.solvedCount)
          .slice(0, 15);
      }
    }

    // 5. Reviews
    const { data: reviews } = await adminClient
      .from('sheet_reviews')
      .select('id, rating, review_text, created_at, profiles(name, avatar_url)')
      .eq('sheet_id', sheetId)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

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
          creatorName: (sheet.profiles as any)?.name || 'Instructor'
        },
        problems,
        difficultyStats,
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
  } catch (err: any) {
    console.error('getExploreSheetDetails error:', err);
    return { data: null, error: err.message || 'Failed to fetch sheet explore details' };
  }
}
