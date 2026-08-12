import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: battleId } = await params;
    const { supabase, user, isInstructor } = await getCodeArenaActor();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // 1. Fetch battle details to verify ownership & problems count
    const { data: battle, error: battleErr } = await supabase
      .from('coding_battles')
      .select('id, created_by, status, duration_minutes')
      .eq('id', battleId)
      .single();

    if (battleErr || !battle) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Battle not found' } },
        { status: 404 }
      );
    }

    // Creator check: Only creator or instructor can start
    if (battle.created_by !== user.id && !isInstructor) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only the battle creator can start this battle' } },
        { status: 403 }
      );
    }

    if (battle.status === 'LIVE') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_LIVE', message: 'Battle is already live' } },
        { status: 409 }
      );
    }

    if (battle.status === 'COMPLETED' || battle.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_STATE', message: 'Cannot start a finished or cancelled battle' } },
        { status: 400 }
      );
    }

    // 2. Check if battle has at least one problem
    const { count: problemCount, error: countErr } = await supabase
      .from('coding_battle_problems')
      .select('problem_id', { count: 'exact', head: true })
      .eq('battle_id', battleId);

    if (countErr || !problemCount || problemCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_PROBLEMS', message: 'Cannot start battle without at least one problem' } },
        { status: 400 }
      );
    }

    // 3. Server-side atomic start timestamp calculation
    const now = new Date();
    const durationMins = battle.duration_minutes || 30;
    const endTime = new Date(now.getTime() + durationMins * 60 * 1000);

    const { data: updatedBattle, error: updateErr } = await supabase
      .from('coding_battles')
      .update({
        status: 'LIVE',
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
      })
      .eq('id', battleId)
      .select()
      .single();

    if (updateErr) {
      console.error('[START BATTLE ERROR]', updateErr);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Failed to start battle' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      battle: updatedBattle,
      server_now: now.toISOString(),
    });
  } catch (err: any) {
    console.error('[START BATTLE API EXCEPTION]', err);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
