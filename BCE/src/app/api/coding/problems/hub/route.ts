import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const platform = searchParams.get('platform')?.toUpperCase() || '';
    const difficulty = searchParams.get('difficulty')?.toUpperCase() || '';
    const ratingMin = parseInt(searchParams.get('rating_min') || '0', 10) || 0;
    const ratingMax = parseInt(searchParams.get('rating_max') || '0', 10) || 0;
    const tag = searchParams.get('tag')?.trim().toLowerCase() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('coding_problems')
      .select('id, title, slug, difficulty, tags, source_type, external_platform, external_problem_id, external_url, time_limit_ms, memory_limit_mb, constraints, created_at', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Platform filter
    if (platform && ['CODEFORCES', 'LEETCODE', 'INTERNAL'].includes(platform)) {
      if (platform === 'INTERNAL') {
        query = query.is('external_platform', null);
      } else {
        query = query.eq('external_platform', platform);
      }
    }

    // Difficulty filter
    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      query = query.eq('difficulty', difficulty);
    }

    // Search filter — search title, slug, external_problem_id
    if (q) {
      query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,external_problem_id.ilike.%${q}%`);
    }

    // Tag filter — use contains for array column
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: problems, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fetch user's solved problem IDs from BCE submissions
    const { data: solvedSubmissions } = await supabase
      .from('coding_submissions')
      .select('problem_id')
      .eq('student_id', user.id)
      .eq('status', 'ACCEPTED');

    const solvedProblemIds = new Set((solvedSubmissions || []).map((s: any) => s.problem_id));

    // Fetch user's attempted problem IDs (any submission)
    const { data: attemptedSubmissions } = await supabase
      .from('coding_submissions')
      .select('problem_id')
      .eq('student_id', user.id);

    const attemptedProblemIds = new Set((attemptedSubmissions || []).map((s: any) => s.problem_id));

    // Fetch user's connected Codeforces solved problems
    let cfSolvedSet = new Set<string>();
    const { data: cfAccount } = await supabase
      .from('student_external_accounts')
      .select('cf_solved_ids')
      .eq('student_id', user.id)
      .eq('platform', 'CODEFORCES')
      .maybeSingle();
    if (cfAccount?.cf_solved_ids && Array.isArray(cfAccount.cf_solved_ids)) {
      cfSolvedSet = new Set(cfAccount.cf_solved_ids.map((id: string) => id.toUpperCase()));
    }

    // Enrich problems with solved status
    const enrichedProblems = (problems || []).map((p: any) => {
      let solvedStatus: 'solved' | 'attempted' | 'unsolved' = 'unsolved';
      if (solvedProblemIds.has(p.id)) {
        solvedStatus = 'solved';
      } else if (attemptedProblemIds.has(p.id)) {
        solvedStatus = 'attempted';
      } else if (p.external_platform === 'CODEFORCES' && p.external_problem_id) {
        if (cfSolvedSet.has(p.external_problem_id.toUpperCase())) {
          solvedStatus = 'solved';
        }
      }
      return { ...p, solvedStatus };
    });

    // Rating filter (client-side since DB may not have a rating column — it's in constraints text)
    let filteredProblems = enrichedProblems;
    if (ratingMin > 0 || ratingMax > 0) {
      filteredProblems = enrichedProblems.filter((p: any) => {
        // We don't have a direct rating column, so skip rating filter for now
        return true;
      });
    }

    // Get unique tags for filter options
    const allTags = new Set<string>();
    (problems || []).forEach((p: any) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t: string) => allTags.add(t));
      }
    });

    return NextResponse.json({
      data: filteredProblems,
      pagination: {
        page, limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      availableTags: Array.from(allTags).sort(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
