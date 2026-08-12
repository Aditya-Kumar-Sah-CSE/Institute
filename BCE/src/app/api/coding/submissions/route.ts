import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { judgeService } from '@/features/code-arena/judge';
import type { CodeLanguage } from '@/features/code-arena/types';

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { problemId, battleId = null, language, sourceCode } = body as { problemId?: string; battleId?: string | null; language?: CodeLanguage; sourceCode?: string };
  if (!problemId || !language || !sourceCode?.trim()) return NextResponse.json({ error: 'Problem, language and source code are required.' }, { status: 400 });
  const { data: problem } = await supabase.from('coding_problems').select('id,time_limit_ms,memory_limit_mb,supported_languages').eq('id', problemId).single();
  if (!problem || !problem.supported_languages.includes(language)) return NextResponse.json({ error: 'Problem or language is not available.' }, { status: 400 });
  if (battleId) {
    const { data: battle } = await supabase.from('coding_battles').select('id,status,end_time').eq('id', battleId).single();
    if (!battle || battle.status !== 'LIVE' || !battle.end_time || new Date(battle.end_time) <= new Date()) return NextResponse.json({ error: 'This battle is no longer accepting submissions.' }, { status: 409 });
  }
  const { data: tests } = await supabase.from('coding_problem_test_cases').select('input,expected_output').eq('problem_id', problemId).eq('is_hidden', false);
  const result = await judgeService.execute({ language, sourceCode, testCases: (tests || []).map(testCase => ({ input: testCase.input, expectedOutput: testCase.expected_output })), timeLimitMs: problem.time_limit_ms, memoryLimitMb: problem.memory_limit_mb });
  const { data, error } = await supabase.from('coding_submissions').insert({ student_id: user.id, problem_id: problemId, battle_id: battleId, language, source_code: sourceCode, status: result.status, passed_tests: result.passedTests, total_tests: result.totalTests, compiler_output: result.compilerOutput, runtime_output: result.runtimeOutput }).select('id,status,created_at').single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const problemId = new URL(request.url).searchParams.get('problemId');
  let query = supabase.from('coding_submissions').select('id,problem_id,battle_id,language,status,score,passed_tests,total_tests,execution_time_ms,created_at').eq('student_id', user.id).order('created_at', { ascending: false }).limit(25);
  if (problemId) query = query.eq('problem_id', problemId);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data });
}
