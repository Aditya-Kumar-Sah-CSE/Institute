import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCodeArenaActor } from '@/features/code-arena/server';

async function generateUniqueJoinCode(supabase: any): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = crypto.randomBytes(5);
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    const fullCode = `BCE-${code}`;
    const { data } = await supabase
      .from('coding_battles')
      .select('id')
      .eq('join_code', fullCode)
      .maybeSingle();

    if (!data) return fullCode;
  }
  return `BCE-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export async function GET() {
  const { supabase, user, isInstructor, profile } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = supabase
    .from('coding_battles')
    .select('id, title, description, status, start_time, end_time, duration_minutes, batch_id, creator_role, join_code, visibility, created_by, created_at, max_participants, team_mode, min_team_size, max_team_size, coding_battle_problems(count), coding_battle_participants(count)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!isInstructor) {
    query = query.or(`created_by.eq.${user.id},visibility.eq.CODE,batch_id.eq.${profile?.graduation_period || ''}`);
  }

  const { data, error } = await query;
  return error
    ? NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 })
    : NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      durationMinutes, 
      batchId, 
      visibility = 'CODE', 
      problems = [],
      maxParticipants = 25,
      teamMode = false,
      minTeamSize = 1,
      maxTeamSize = 1,
    } = body;
    const duration = Number(durationMinutes || 30);

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BATTLE_NAME_REQUIRED', message: 'Please enter a battle name.' } },
        { status: 400 }
      );
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_DURATION', message: 'Duration must be between 1 and 1440 minutes.' } },
        { status: 400 }
      );
    }

    if (!Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_PROBLEMS', message: 'Please add at least one problem to the battle.' } },
        { status: 400 }
      );
    }

    const creatorRole = isInstructor ? 'FACULTY' : 'STUDENT';
    const joinCode = await generateUniqueJoinCode(supabase);

    // 1. Create battle in LOBBY state
    const { data: battle, error: createError } = await supabase
      .from('coding_battles')
      .insert({
        title: title.trim(),
        description: description || null,
        duration_minutes: duration,
        batch_id: isInstructor && batchId ? batchId : null,
        creator_role: creatorRole,
        join_code: joinCode,
        visibility: isInstructor ? (batchId ? 'BATCH' : visibility) : visibility,
        status: 'LOBBY',
        start_time: null,
        end_time: null,
        created_by: user.id,
        max_participants: Number(maxParticipants || 25),
        team_mode: Boolean(teamMode),
        min_team_size: Number(minTeamSize || 1),
        max_team_size: Number(maxTeamSize || 1),
      })
      .select()
      .single();

    if (createError) {
      console.error('Battle creation DB error:', createError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: createError.message || 'Failed to save battle.' } },
        { status: 400 }
      );
    }

    // 2. Link problems atomically
    const problemLinks = problems.map((p: any, idx: number) => ({
      battle_id: battle.id,
      problem_id: p.id,
      points: Number(p.points || 100),
      order_index: idx,
    }));

    const { error: linkError } = await supabase.from('coding_battle_problems').insert(problemLinks);
    if (linkError) {
      console.error('Battle problem link error:', linkError);
      // Clean up orphaned battle if linking fails
      await supabase.from('coding_battles').delete().eq('id', battle.id);
      return NextResponse.json(
        { success: false, error: { code: 'PROBLEM_LINK_FAILED', message: 'Could not attach problems to battle.' } },
        { status: 400 }
      );
    }

    // 3. Auto-join creator as first participant
    await supabase.from('coding_battle_participants').insert({
      battle_id: battle.id,
      student_id: user.id,
      score: 0,
    });

    return NextResponse.json({ success: true, data: battle }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Battle creation failed' } },
      { status: 500 }
    );
  }
}
