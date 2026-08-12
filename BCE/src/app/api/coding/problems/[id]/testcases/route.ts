import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('coding_problem_test_cases').select('id,input,expected_output,sample_name,order_index').eq('problem_id', id).eq('is_hidden', false).order('order_index');
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data });
}
