import { notFound } from 'next/navigation';
import { Code2, Bell, UserCircle, Trophy } from 'lucide-react';
import { getCodeArenaActor } from '@/features/code-arena/server';
import ProblemStatementRenderer from '@/features/code-arena/components/ProblemStatementRenderer';
import CodeEditor from '@/features/code-arena/components/CodeEditor';
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

  let problemData = {
    ...problem,
    samples: samples || [],
    hasSolved,
    hasAttempted,
  };

  if ((problem.source_type === 'CODEFORCES' || problem.external_platform === 'CODEFORCES') && problem.external_problem_id) {
    const ident = codeforcesAdapter.parseIdentifier(problem.external_problem_id);
    if (ident && ident.contestId && ident.problemIndex) {
      const scraped = await getCodeforcesProblemSafe(ident.contestId, ident.problemIndex);
      if (scraped) {
        problemData = {
          ...problemData,
          title: scraped.title || problemData.title,
          statement: scraped.statement || problemData.statement,
          input_format: scraped.inputFormat || problemData.input_format,
          output_format: scraped.outputFormat || problemData.output_format,
          explanation: scraped.explanation || problemData.explanation,
          constraints: scraped.constraints || problemData.constraints,
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

  if ((problem.source_type === 'LEETCODE' || problem.external_platform === 'LEETCODE') && problem.external_problem_id) {
    const scraped = await getLeetCodeProblemSafe(problem.external_problem_id);
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

      {/* 3-Pane Desktop IDE Grid Layout */}
      <div className="code-arena-ide-layout">
        {/* Left Problem Statement Panel */}
        <section className="code-statement-panel">
          <ProblemStatementRenderer problem={problemData} />
        </section>

        {/* Right Monaco Editor Panel */}
        <CodeEditor
          problem={problemData}
          samples={problemData.samples}
        />
      </div>
    </div>
  );
}
