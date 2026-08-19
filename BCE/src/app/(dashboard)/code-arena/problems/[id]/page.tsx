import { notFound } from 'next/navigation';
import { Code2, Bell, UserCircle, Trophy } from 'lucide-react';
import { getCodeArenaActor } from '@/features/code-arena/server';
import ProblemStatementRenderer from '@/features/code-arena/components/ProblemStatementRenderer';
import CodeEditor from '@/features/code-arena/components/CodeEditor';
import ResizableIdeLayout from '@/features/code-arena/components/ResizableIdeLayout';
import { unstable_cache } from 'next/cache';
import { codeforcesAdapter } from '@/lib/coding-platforms/codeforces';
import { leetcodeAdapter } from '@/lib/coding-platforms/leetcode';
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

async function getLeetCodeProblemSafe(slug: string) {
  try {
    return await getCachedLeetCodeProblem(slug);
  } catch (e) {
    console.error(`Failed to fetch LeetCode problem ${slug}:`, e);
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

export default async function CodeProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return null;

  const { data: problem } = await supabase
    .from('coding_problems')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!problem) notFound();

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
  };

  const isLc = problem.source_type === 'LEETCODE' || problem.external_platform === 'LEETCODE';
  const isCf = problem.source_type === 'CODEFORCES' || problem.external_platform === 'CODEFORCES';

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
  } else if (isCf && problem.external_problem_id) {
    const match = problem.external_problem_id.match(/^(\d+)([A-Z]\d*)$/i);
    if (match) {
      const scraped = await getCodeforcesProblemSafe(match[1], match[2]);
      if (scraped) {
        problemData = {
          ...problemData,
          title: scraped.title || problemData.title,
          statement: scraped.statement || problemData.statement,
          input_format: scraped.inputFormat || problemData.input_format,
          output_format: scraped.outputFormat || problemData.output_format,
          explanation: scraped.explanation || problemData.explanation,
          constraints: scraped.constraints || problemData.constraints,
          starterCode: scraped.starterCode || null,
        };

        if (scraped.examples && scraped.examples.length > 0) {
          problemData.samples = scraped.examples.map((ex, idx) => ({
            input: ex.input,
            expected_output: ex.output,
            sample_name: `Sample #${idx + 1}`,
            order_index: idx,
          }));
        }
      }
    }
  }

  return (
    <div className="code-arena-page">
      {/* Compact IDE Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left">
          <div className="code-arena-logo-box">
            <Code2 size={20} />
          </div>
          <div>
            <h1 className="code-arena-header-title">
              BCE Bhagalpur
              <span className="code-arena-badge-sub">· Code Arena</span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Trophy size={13} /> Practice Arena
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <button
              type="button"
              className="oj-icon-btn"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={15} />
            </button>
            <button
              type="button"
              className="oj-icon-btn"
              aria-label="User profile"
              title="User profile"
            >
              <UserCircle size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Resizable Desktop IDE Layout */}
      <div className="code-arena-workspace-container">
        <ResizableIdeLayout problemData={problemData} />
      </div>
    </div>
  );
}
