import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(request: Request) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const difficulty = searchParams.get('difficulty');
  let db = supabase.from('coding_problems').select('id,title,slug,difficulty,tags,source_type,external_url,time_limit_ms,memory_limit_mb,created_at,created_by,coding_problem_test_cases(count),coding_submissions(count)').order('created_at', { ascending: false }).limit(50);
  if (isInstructor) db = db.eq('created_by', user.id);
  if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) db = db.eq('difficulty', difficulty);
  if (query) db = db.ilike('title', `%${query}%`);
  const { data, error } = await db;
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data });
}
