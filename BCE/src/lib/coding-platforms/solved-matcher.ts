import { SupabaseClient } from '@supabase/supabase-js';

export type ProblemItem = {
  id: string;
  title: string;
  external_platform?: string | null;
  external_problem_id?: string | null;
  external_url?: string | null;
  source_type?: string | null;
};

export type SolvedStatus = {
  isSolved: boolean;
  sources: ('ARENA' | 'LEETCODE' | 'CODEFORCES' | 'CODECHEF' | 'GEEKSFORGEEKS')[];
  primarySource?: 'ARENA' | 'LEETCODE' | 'CODEFORCES' | 'CODECHEF' | 'GEEKSFORGEEKS';
  lastSubmissionId?: string;
};

export type SolvedStatusMap = Record<string, SolvedStatus>;

/**
 * Batch fetches and matches problem solved status for a user across Smart Learn Arena
 * and connected external accounts (LeetCode, Codeforces, CodeChef, GeeksforGeeks).
 * Avoids N+1 queries by executing batched DB queries.
 */
export async function getSolvedStatusMap(
  supabase: SupabaseClient,
  userId: string,
  problems: ProblemItem[]
): Promise<SolvedStatusMap> {
  const result: SolvedStatusMap = {};
  if (!userId || !problems || problems.length === 0) {
    return result;
  }

  // Initialize status map for all problems
  problems.forEach((p) => {
    result[p.id] = {
      isSolved: false,
      sources: [],
    };
  });

  const problemIds = problems.map((p) => p.id);

  // 1. Batch Query: Fetch Arena accepted submissions
  const { data: arenaSubmissions } = await supabase
    .from('coding_submissions')
    .select('id, problem_id, created_at')
    .eq('student_id', userId)
    .in('problem_id', problemIds)
    .eq('status', 'ACCEPTED')
    .order('created_at', { ascending: false });

  // Map latest Arena submission per problem
  const arenaSolvedMap = new Map<string, string>();
  if (arenaSubmissions) {
    for (const sub of arenaSubmissions) {
      if (!arenaSolvedMap.has(sub.problem_id)) {
        arenaSolvedMap.set(sub.problem_id, sub.id);
      }
    }
  }

  // 2. Batch Query: Fetch student_completed_problems
  const { data: completedRows } = await supabase
    .from('student_completed_problems')
    .select('platform, problem_id')
    .eq('student_id', userId);

  const completedMap = new Set<string>(); // "PLATFORM:PROBLEM_ID"
  if (completedRows) {
    for (const row of completedRows) {
      completedMap.add(`${row.platform?.toUpperCase()}:${row.problem_id}`);
    }
  }

  // 3. Batch Query: Fetch connected external accounts metadata
  const { data: externalAccounts } = await supabase
    .from('student_external_accounts')
    .select('platform, username, metadata')
    .eq('student_id', userId);

  const lcSolvedSlugs = new Set<string>();
  const cfSolvedIds = new Set<string>();

  if (externalAccounts) {
    for (const acc of externalAccounts) {
      const platform = acc.platform?.toUpperCase();
      const meta = acc.metadata || {};

      if (platform === 'LEETCODE') {
        const recentSubmissions = meta.recent_submissions || [];
        for (const sub of recentSubmissions) {
          if (sub.verdict === 'OK' || sub.status === 'Accepted' || sub.slug) {
            if (sub.slug) lcSolvedSlugs.add(sub.slug.toLowerCase());
            if (sub.problem) lcSolvedSlugs.add(sub.problem.toLowerCase());
          }
        }
      }

      if (platform === 'CODEFORCES') {
        const cfIds = meta.cf_solved_ids || [];
        for (const cfId of cfIds) {
          cfSolvedIds.add(String(cfId).toUpperCase());
        }
      }
    }
  }

  // 4. Cross-reference problems and populate solved map
  for (const problem of problems) {
    const sourcesSet = new Set<'ARENA' | 'LEETCODE' | 'CODEFORCES' | 'CODECHEF' | 'GEEKSFORGEEKS'>();
    let lastSubId: string | undefined = undefined;

    // Check Arena
    if (arenaSolvedMap.has(problem.id)) {
      sourcesSet.add('ARENA');
      lastSubId = arenaSolvedMap.get(problem.id);
    }

    const extId = (problem.external_problem_id || '').trim();
    const extPlatform = (problem.external_platform || problem.source_type || '').toUpperCase();
    const extUrl = problem.external_url || '';

    // Check student_completed_problems table
    ['LEETCODE', 'CODEFORCES', 'CODECHEF', 'GEEKSFORGEEKS'].forEach((plat) => {
      if (
        completedMap.has(`${plat}:${problem.id}`) ||
        (extId && completedMap.has(`${plat}:${extId}`))
      ) {
        sourcesSet.add(plat as any);
      }
    });

    // Check LeetCode metadata matching
    if (extPlatform === 'LEETCODE' || extUrl.includes('leetcode.com')) {
      const lcSlugFromUrl = extUrl.match(/leetcode\.com\/problems\/([^/]+)/)?.[1]?.toLowerCase();
      const targetSlug = (extId || lcSlugFromUrl || problem.title.toLowerCase().replace(/\s+/g, '-')).toLowerCase();

      if (lcSolvedSlugs.has(targetSlug) || lcSolvedSlugs.has(problem.title.toLowerCase())) {
        sourcesSet.add('LEETCODE');
      }
    }

    // Check Codeforces metadata matching
    if (extPlatform === 'CODEFORCES' || extUrl.includes('codeforces.com')) {
      const cfIdFromUrl = extUrl.match(/codeforces\.com\/(?:problemset\/problem|contest\/\d+\/problem)\/(\d+)\/([A-Za-z0-9]+)/);
      const targetCfId = cfIdFromUrl ? `${cfIdFromUrl[1]}${cfIdFromUrl[2]}`.toUpperCase() : extId.toUpperCase();

      if (targetCfId && cfSolvedIds.has(targetCfId)) {
        sourcesSet.add('CODEFORCES');
      }
    }

    const sources = Array.from(sourcesSet);
    const isSolved = sources.length > 0;

    // Primary source priority: ARENA > LEETCODE > CODEFORCES > CODECHEF > GEEKSFORGEEKS
    let primarySource: SolvedStatus['primarySource'] = undefined;
    if (sources.includes('ARENA')) primarySource = 'ARENA';
    else if (sources.includes('LEETCODE')) primarySource = 'LEETCODE';
    else if (sources.includes('CODEFORCES')) primarySource = 'CODEFORCES';
    else if (sources.includes('CODECHEF')) primarySource = 'CODECHEF';
    else if (sources.includes('GEEKSFORGEEKS')) primarySource = 'GEEKSFORGEEKS';

    result[problem.id] = {
      isSolved,
      sources,
      primarySource,
      lastSubmissionId: lastSubId,
    };
  }

  return result;
}
