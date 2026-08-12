import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
export async function GET(_: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params; const { supabase, user } = await getCodeArenaActor(); if (!user) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { data, error } = await supabase.from('coding_battle_participants').select('student_id,score,rank,joined_at,finished_at,profiles:student_id(name,avatar_url)').eq('battle_id', id).order('score', { ascending:false }).order('finished_at', { ascending:true, nullsFirst:false });
  return error ? NextResponse.json({ error:error.message }, { status:400 }) : NextResponse.json({ data: data?.map((row:any,index:number) => ({ ...row, rank:index+1 })) || [] });
}
