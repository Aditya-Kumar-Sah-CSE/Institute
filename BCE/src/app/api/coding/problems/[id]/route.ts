import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('coding_problems').select('*, coding_problem_test_cases(id,input,expected_output,is_hidden,sample_name,order_index)').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });
  return NextResponse.json({ data });
}
