import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET() {
  const { supabase, user, isInstructor, profile } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let query = supabase.from('coding_battles').select('id,title,description,status,start_time,end_time,duration_minutes,batch_id,created_at').order('created_at', { ascending:false }).limit(50);
  if (isInstructor) query = query.eq('created_by', user.id); else if (profile?.graduation_period) query = query.eq('batch_id', profile.graduation_period);
  const { data, error } = await query; return error ? NextResponse.json({ error:error.message }, { status:400 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { supabase, user, isInstructor } = await getCodeArenaActor(); if (!user || !isInstructor) return NextResponse.json({ error:'Instructor access is required.' }, { status:403 });
  const body = await request.json(); const duration = Number(body.durationMinutes);
  if (!body.title?.trim() || !Number.isInteger(duration) || duration < 1 || duration > 1440) return NextResponse.json({ error:'A title and duration between 1 and 1440 minutes are required.' }, { status:400 });
  const { data, error } = await supabase.from('coding_battles').insert({ title:body.title.trim(), description:body.description || null, duration_minutes:duration, batch_id:body.batchId || null, status:'DRAFT', created_by:user.id }).select().single();
  return error ? NextResponse.json({ error:error.message }, { status:400 }) : NextResponse.json({ data }, { status:201 });
}
