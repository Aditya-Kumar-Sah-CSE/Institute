import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import Link from 'next/link';
import { getCodeArenaActor } from '@/features/code-arena/server';
import ProblemStatementRenderer from '@/features/code-arena/components/ProblemStatementRenderer';
import CodeEditor from '@/features/code-arena/components/CodeEditor';
import ResizableIdeLayout from '@/features/code-arena/components/ResizableIdeLayout';
import FocusTimer from '@/features/code-arena/components/FocusTimer';
import SpotifyConnect from '@/features/code-arena/components/SpotifyConnect';
import UserAvatar from '@/components/shared/UserAvatar';
import { unstable_cache } from 'next/cache';
import { codeforcesAdapter } from '@/lib/coding-platforms/codeforces';
import { leetcodeAdapter } from '@/lib/coding-platforms/leetcode';
import { gfgAdapter } from '@/lib/coding-platforms/gfg';
import '@/features/code-arena/components/CodeArena.css';

// Cache Codeforces problem data for 1 hour
const getCachedCodeforcesProblem = unstable_cache(
  async (contestId: string, problemIndex: string) => {
    const ident = {
      platform: 'CODEFORCES' as const,
      contestId,
      problemIndex,
      rawInput: `${contestId}${problemIndex}`
    };
    return await codeforcesAdapter.fetchProblem(ident);
  },
  ['codeforces-problem-cache'],
  { revalidate: 3600 }
);

// Cache LeetCode problem data for 1 hour
const getCachedLeetCodeProblem = unstable_cache(
  async (slug: string) => {
    const ident = {
      platform: 'LEETCODE' as const,
      slug,
      rawInput: slug
    };
    return await leetcodeAdapter.fetchProblem(ident);
  },
  ['leetcode-problem-cache'],
  { revalidate: 3600 }
);

// Cache GFG problem data for 1 hour
const getCachedGfgProblem = unstable_cache(
  async (slug: string) => {
    const ident = {
      platform: 'GEEKSFORGEEKS' as const,
      slug,
      rawInput: slug
    };
    return await gfgAdapter.fetchProblem(ident);
  },
  ['gfg-problem-cache'],
  { revalidate: 3600 }
);

async function getLeetCodeProblemSafe(slug: string) {
  try {
    return await getCachedLeetCodeProblem(slug);
  } catch (e) {
    console.error(`Failed to fetch LeetCode problem ${slug}:`, e);
    return null;
  }
}

async function getGfgProblemSafe(slug: string) {
  try {
    return await getCachedGfgProblem(slug);
  } catch (e) {
    console.error(`Failed to fetch GFG problem ${slug}:`, e);
    return null;
  }
}

async function getCodeforcesProblemSafe(contestId: string, problemIndex: string) {
  try {
    return await getCachedCodeforcesProblem(contestId, problemIndex);
  } catch (e) {
    console.error(`Failed to fetch Codeforces problem ${contestId}${problemIndex}:`, e);
    return null;
  }
}

export default async function CodeProblemPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ sheet?: string }> }) {
  const { id } = await params;
  const search = await searchParams;
  const sheetId = search?.sheet;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const profileName = profile?.name || 'User';
  const profileAvatar = profile?.avatar_url || null;

  const { data: problem } = await supabase
    .from('coding_problems')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!problem) notFound();

  let sheetData: { id: string; title: string; slug?: string } | null = null;
  let text_solution = null;
  let youtube_url = null;

  if (sheetId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sheetId);
    let sheetQuery = supabase.from('coding_sheets').select('id, title, slug');
    if (isUUID) {
      sheetQuery = sheetQuery.eq('id', sheetId);
    } else {
      sheetQuery = sheetQuery.eq('slug', sheetId);
    }

    const { data: sheet } = await sheetQuery.maybeSingle();

    if (sheet) {
      sheetData = sheet;
      const { data: sheetProblem } = await supabase
        .from('coding_sheet_problems')
        .select('text_solution, youtube_url')
        .eq('sheet_id', sheet.id)
        .eq('problem_id', id)
        .maybeSingle();

      if (sheetProblem) {
        text_solution = sheetProblem.text_solution;
        youtube_url = sheetProblem.youtube_url;
      }
    }
  }

  // Fallback: If no sheetId in query params, find if this problem is in ANY sheet
  if (!sheetData) {
    const { data: anySheetProblem } = await supabase
      .from('coding_sheet_problems')
      .select('sheet_id, text_solution, youtube_url, coding_sheets(id, title, slug)')
      .eq('problem_id', id)
      .limit(1)
      .maybeSingle();

    if (anySheetProblem) {
      if (!text_solution && !youtube_url) {
        text_solution = anySheetProblem.text_solution;
        youtube_url = anySheetProblem.youtube_url;
      }
      if (anySheetProblem.coding_sheets) {
        const s = anySheetProblem.coding_sheets as any;
        sheetData = { id: s.id, title: s.title, slug: s.slug };
      }
    }
  }

  const { data: samples } = await supabase
    .from('coding_problem_test_cases')
    .select('input,expected_output,sample_name,order_index')
    .eq('problem_id', id)
    .eq('is_hidden', false)
    .order('order_index');

  const { data: submissions } = await supabase
    .from('coding_submissions')
    .select('status')
    .eq('problem_id', id)
    .eq('student_id', user.id);

  const hasSolved = (submissions || []).some(s => s.status === 'ACCEPTED');
  const hasAttempted = (submissions || []).length > 0;

  let sheetProblems: { problem_id: string }[] = [];
  if (sheetData) {
    const { data: problemsList } = await supabase
      .from('coding_sheet_problems')
      .select('problem_id')
      .eq('sheet_id', sheetData.id)
      .order('order_index', { ascending: true });
    sheetProblems = problemsList || [];
  } else {
    const { data: allProblems } = await supabase
      .from('coding_problems')
      .select('id')
      .eq('is_published', true)
      .order('created_at', { ascending: true });
    sheetProblems = (allProblems || []).map(p => ({ problem_id: p.id }));
  }

  const currentIndex = sheetProblems.findIndex(p => p.problem_id === id);
  const navigation = currentIndex !== -1 ? {
    currentIndex,
    totalProblems: sheetProblems.length,
    prevProblemId: currentIndex > 0 ? sheetProblems[currentIndex - 1].problem_id : null,
    nextProblemId: currentIndex < sheetProblems.length - 1 ? sheetProblems[currentIndex + 1].problem_id : null,
    firstProblemId: sheetProblems.length > 0 ? sheetProblems[0].problem_id : null,
    lastProblemId: sheetProblems.length > 0 ? sheetProblems[sheetProblems.length - 1].problem_id : null,
    sheetId: sheetId || null,
  } : null;

  const pAny = problem as any;
  let problemData = {
    ...problem,
    samples: samples || [],
    hasSolved,
    hasAttempted,
    starterCode: pAny.starter_code || null,
    hints: pAny.hints || [],
    follow_up: pAny.follow_up || null,
    is_premium: !!pAny.is_premium,
    examples: pAny.examples || [],
    text_solution,
    youtube_url,
    navigation,
  };

  const isLc = problem.source_type === 'LEETCODE' || problem.external_platform === 'LEETCODE';
  const isCf = problem.source_type === 'CODEFORCES' || problem.external_platform === 'CODEFORCES';
  const isGfg = problem.source_type === 'GEEKSFORGEEKS' || problem.external_platform === 'GEEKSFORGEEKS';

  if (isLc) {
    const needSync = !pAny.starter_code || Object.keys(pAny.starter_code).length === 0 || !problem.description || (samples || []).length === 0;
    if (needSync) {
      console.log(`[PAGE] LeetCode problem ${problem.external_problem_id} cache incomplete. Fetching and syncing...`);
      const scraped = await getLeetCodeProblemSafe(problem.external_problem_id || '');
      if (scraped) {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminClient = await createAdminClient();
        const cleanTitle = (scraped.title || problem.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const correctSlug = `leetcode-${scraped.externalId || problem.external_problem_id}-${cleanTitle}`;
        await adminClient
          .from('coding_problems')
          .update({
            title: scraped.title || problem.title,
            slug: correctSlug,
            description: scraped.statement || problem.description,
            constraints: scraped.constraints || problem.constraints,
            explanation: scraped.explanation || problem.explanation,
            signature: scraped.signature || null,
            starter_code: scraped.starterCode || {},
            examples: scraped.examples || [],
            hints: scraped.hints || [],
            follow_up: scraped.followUp || null,
            is_premium: !!scraped.isPremium,
            metadata: scraped.metadata || {},
            external_problem_id: scraped.externalId || problem.external_problem_id,
            external_url: scraped.officialUrl || problem.external_url,
          })
          .eq('id', problem.id);
        
        if ((samples || []).length === 0 && scraped.examples && scraped.examples.length > 0) {
          const testCasesToInsert = scraped.examples.map((ex, idx) => ({
            problem_id: problem.id,
            input: ex.input,
            expected_output: ex.output,
            is_hidden: false,
            sample_name: `Sample ${idx + 1}`,
            order_index: idx,
          }));
          await adminClient.from('coding_problem_test_cases').insert(testCasesToInsert);
        }

        problemData = {
          ...problemData,
          title: scraped.title || problemData.title,
          description: scraped.statement || problemData.description,
          statement: scraped.statement || problemData.statement,
          input_format: scraped.inputFormat || problemData.input_format,
          output_format: scraped.outputFormat || problemData.output_format,
          explanation: scraped.explanation || problemData.explanation,
          constraints: scraped.constraints || problemData.constraints,
          starterCode: scraped.starterCode || null,
          hints: scraped.hints || [],
          follow_up: scraped.followUp || null,
          is_premium: !!scraped.isPremium,
          examples: scraped.examples || [],
          external_url: scraped.officialUrl || problemData.external_url,
          external_problem_id: scraped.externalId || problemData.external_problem_id,
          samples: scraped.examples ? scraped.examples.map((ex, idx) => ({
            input: ex.input,
            expected_output: ex.output,
            sample_name: `Sample #${idx + 1}`,
            order_index: idx,
          })) : samples || [],
        };
      }
    } else {
      problemData = {
        ...problemData,
        statement: problem.description,
        starterCode: pAny.starter_code || null,
        hints: pAny.hints || [],
        follow_up: pAny.follow_up || null,
        is_premium: !!pAny.is_premium,
        examples: pAny.examples || [],
      };
      
      if (problemData.samples.length === 0 && pAny.examples && pAny.examples.length > 0) {
        problemData.samples = pAny.examples.map((ex: any, idx: number) => ({
          input: ex.input,
          expected_output: ex.output,
          sample_name: `Sample #${idx + 1}`,
          order_index: idx,
        }));
      }
    }
  } else if (isGfg) {
    const scraped = await getGfgProblemSafe(problem.external_problem_id || problem.slug || '');
    if (scraped) {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminClient = await createAdminClient();
      await adminClient
        .from('coding_problems')
        .update({
          title: scraped.title || problem.title,
          description: scraped.statement || problem.description,
          constraints: scraped.constraints || problem.constraints,
          starter_code: scraped.starterCode || {},
          examples: scraped.examples || [],
          metadata: scraped.metadata || {},
          external_url: scraped.officialUrl || problem.external_url,
        })
        .eq('id', problem.id);

      problemData = {
        ...problemData,
        title: scraped.title || problemData.title,
        statement: scraped.statement || problemData.statement,
        description: scraped.statement || problemData.description,
        constraints: scraped.constraints || problemData.constraints,
        starterCode: scraped.starterCode || problemData.starterCode,
      };

      if ((samples || []).length === 0 && scraped.examples && scraped.examples.length > 0) {
        problemData.samples = scraped.examples.map((ex, idx) => ({
          input: ex.input,
          expected_output: ex.output,
          sample_name: `Sample #${idx + 1}`,
          order_index: idx,
        }));
      }
    }
  }

  return (
    <div className="code-arena-page ide-mode">
      {/* Compact IDE Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left">
          <div className="code-arena-logo-box">
            <Trophy size={18} />
          </div>
          <h1 className="code-arena-header-title">
            Practice Arena
            <span className="code-arena-badge-sub">Code Arena</span>
          </h1>
        </div>

        <div className="code-arena-header-controls">
          <SpotifyConnect />
          <FocusTimer />
          
          <Link
            href="/profile"
            className="oj-icon-btn profile-avatar-btn"
            style={{ overflow: 'hidden', position: 'relative', width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
            title={`View Profile: ${profileName}`}
            aria-label="View Profile"
          >
            <UserAvatar url={profileAvatar} name={profileName} size={32} />
          </Link>
        </div>
      </header>

      {/* Resizable Desktop IDE Layout */}
      <div className="code-arena-workspace-container">
        <Suspense fallback={<div className="code-editor-loading" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading IDE Workspace…</div>}>
          <ResizableIdeLayout problemData={problemData} />
        </Suspense>
      </div>
    </div>
  );
}
