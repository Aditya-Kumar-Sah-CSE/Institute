import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required to join battle.' } },
      { status: 401 }
    );
  }

  try {
    const { joinCode } = await request.json();
    if (!joinCode || typeof joinCode !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CODE', message: 'Battle code is required.' } },
        { status: 400 }
      );
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    // 1. Resolve battle by join_code or UUID id
    let query = supabase
      .from('coding_battles')
      .select('id, title, description, status, duration_minutes, join_code, visibility, created_by, created_at, batch_id, max_participants')
      .eq('join_code', normalizedCode);

    const { data: battle, error: findError } = await query.maybeSingle();

    if (findError || !battle) {
      return NextResponse.json(
        { success: false, error: { code: 'BATTLE_NOT_FOUND', message: 'Battle not found. Check the code and try again.' } },
        { status: 404 }
      );
    }

    if (battle.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { code: 'BATTLE_ENDED', message: 'This battle has been cancelled.' } },
        { status: 400 }
      );
    }

    // 1.5 Batch / Isolation Enforcements
    const actor = await getCodeArenaActor();
    const profile = actor.profile;
    const isHost = battle.created_by === user.id || actor.isInstructor;
    if (!isHost && battle.batch_id && profile?.graduation_period && battle.batch_id !== profile.graduation_period) {
      return NextResponse.json(
        { success: false, error: { code: 'BATCH_MISMATCH', message: `This battle is restricted to students of batch: ${battle.batch_id}.` } },
        { status: 403 }
      );
    }

    // 2. Check current participant count and existing participation
    const { count: currentParticipantsCount } = await supabase
      .from('coding_battle_participants')
      .select('student_id', { count: 'exact', head: true })
      .eq('battle_id', battle.id);

    const { data: existingParticipant } = await supabase
      .from('coding_battle_participants')
      .select('student_id')
      .eq('battle_id', battle.id)
      .eq('student_id', user.id)
      .maybeSingle();

    const maxLimit = battle.max_participants || 25;
    if (!existingParticipant && (currentParticipantsCount || 0) >= maxLimit) {
      return NextResponse.json(
        { success: false, error: { code: 'BATTLE_FULL', message: `Battle is full. Maximum ${maxLimit} participants allowed.` } },
        { status: 400 }
      );
    }

    // 3. Add student to coding_battle_participants if not already joined
    const { error: joinError } = await supabase.from('coding_battle_participants').upsert(
      {
        battle_id: battle.id,
        student_id: user.id,
        score: 0,
      },
      { onConflict: 'battle_id,student_id' }
    );

    if (joinError) {
      console.error('Participant join DB error:', joinError);
      return NextResponse.json(
        { success: false, error: { code: 'JOIN_FAILED', message: joinError.message || 'Failed to join battle.' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: battle,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to join battle.' } },
      { status: 500 }
    );
  }
}
