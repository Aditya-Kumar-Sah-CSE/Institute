import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('coding_battle_participants')
    .select('*, profiles:student_id(full_name:name, avatar_url)')
    .eq('battle_id', id)
    .order('score', { ascending: false })
    .order('finished_at', { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const participants = data?.map((row: any, index: number) => ({
    ...row,
    rank: index + 1,
  })) || [];

  return NextResponse.json({ success: true, participants });
}
