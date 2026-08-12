import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(_: Request, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params; const { supabase, user, profile } = await getCodeArenaActor(); if (!user) return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  const { data:battle } = await supabase.from('coding_battles').select('id,status,batch_id').eq('id', id).single();
  if (!battle || !['SCHEDULED','LIVE'].includes(battle.status) || (battle.batch_id && battle.batch_id !== profile?.graduation_period)) return NextResponse.json({ error:'You are not eligible to join this battle.' }, { status:403 });
  const { count } = await supabase.from('coding_battle_participants').select('*', { count:'exact', head:true }).eq('battle_id',id);
  if ((count || 0) >= 25) return NextResponse.json({ error:'This battle has reached its 25 participant limit.' }, { status:409 });
  const { data, error } = await supabase.from('coding_battle_participants').insert({ battle_id:id, student_id:user.id }).select().single();
  return error ? NextResponse.json({ error:error.message }, { status:400 }) : NextResponse.json({ data }, { status:201 });
}
