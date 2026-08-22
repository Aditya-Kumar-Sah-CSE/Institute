import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: battle, error } = await supabase
    .from('coding_battles')
    .select('*, coding_battle_problems(*, coding_problems(*))')
    .eq('id', id)
    .single();

  if (error || !battle) {
    return NextResponse.json({ success: false, error: { message: 'Battle not found' } }, { status: 404 });
  }

  const now = new Date();

  // 1. Auto SCHEDULED/LOBBY -> LIVE/COMPLETED transition when start_time arrives
  if (
    (battle.status === 'LOBBY' || battle.status === 'SCHEDULED') &&
    battle.start_time &&
    now >= new Date(battle.start_time)
  ) {
    const elapsedMinutes = Math.floor((now.getTime() - new Date(battle.start_time).getTime()) / (60 * 1000));
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = await createAdminClient();

    if (elapsedMinutes >= battle.duration_minutes) {
      await adminClient
        .from('coding_battles')
        .update({
          status: 'COMPLETED',
          end_time: new Date(new Date(battle.start_time).getTime() + battle.duration_minutes * 60 * 1000).toISOString()
        })
        .eq('id', id);
    } else {
      const endTime = new Date(new Date(battle.start_time).getTime() + battle.duration_minutes * 60 * 1000);
      await adminClient
        .from('coding_battles')
        .update({
          status: 'LIVE',
          end_time: endTime.toISOString()
        })
        .eq('id', id);
    }

    const { data: reloaded } = await supabase
      .from('coding_battles')
      .select('*, coding_battle_problems(*, coding_problems(*))')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data: reloaded || battle, server_now: now.toISOString() });
  }

  // 2. Auto LIVE -> COMPLETED verification on time expiration
  if (battle.status === 'LIVE' && battle.end_time && now >= new Date(battle.end_time)) {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = await createAdminClient();
    await adminClient
      .from('coding_battles')
      .update({ status: 'COMPLETED' })
      .eq('id', id);

    const { data: reloaded } = await supabase
      .from('coding_battles')
      .select('*, coding_battle_problems(*, coding_problems(*))')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data: reloaded || battle, server_now: now.toISOString() });
  }

  return NextResponse.json({ success: true, data: battle, server_now: now.toISOString() });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  try {
    // 1. Fetch existing battle
    const { data: existing, error: fetchErr } = await supabase
      .from('coding_battles')
      .select('id, created_by, status, duration_minutes')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Battle not found' } }, { status: 404 });
    }

    // 2. Ownership check
    if (existing.created_by !== user.id && !isInstructor) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the battle creator can edit this battle.' } }, { status: 403 });
    }

    // 3. SERVER LOCK GUARD: Cannot edit once LIVE, COMPLETED, or CANCELLED
    if (['LIVE', 'COMPLETED', 'CANCELLED'].includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BATTLE_LOCKED',
            message: `Battle cannot be edited while in status: ${existing.status}.`,
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, durationMinutes, batchId, visibility, problems, maxParticipants, teamMode, minTeamSize, maxTeamSize, scheduledStartTime, organizerName, organizerLogo } = body;

    const updates: any = {};
    if (title?.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description || null;
    if (organizerName !== undefined) updates.organizer_name = organizerName?.trim() || null;
    if (organizerLogo !== undefined) updates.organizer_logo = organizerLogo?.trim() || null;
    if (durationMinutes && Number.isInteger(Number(durationMinutes))) {
      updates.duration_minutes = Number(durationMinutes);
    }
    if (visibility) updates.visibility = visibility;
    if (batchId !== undefined) updates.batch_id = batchId || null;
    if (maxParticipants !== undefined) updates.max_participants = Number(maxParticipants);
    if (teamMode !== undefined) updates.team_mode = Boolean(teamMode);
    if (minTeamSize !== undefined) updates.min_team_size = Number(minTeamSize);
    if (maxTeamSize !== undefined) updates.max_team_size = Number(maxTeamSize);

    // Handle scheduling
    if (scheduledStartTime !== undefined) {
      if (scheduledStartTime) {
        const dur = updates.duration_minutes || existing.duration_minutes || 30;
        updates.status = 'SCHEDULED';
        updates.start_time = new Date(scheduledStartTime).toISOString();
        updates.end_time = new Date(new Date(scheduledStartTime).getTime() + dur * 60 * 1000).toISOString();
      } else {
        // Clear scheduling → revert to LOBBY
        updates.status = 'LOBBY';
        updates.start_time = null;
        updates.end_time = null;
      }
    }

    // 4. Update battle attributes
    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('coding_battles')
        .update(updates)
        .eq('id', id);

      if (updateErr) {
        return NextResponse.json({ success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } }, { status: 400 });
      }
    }

    // 5. Update problem linkages if problems array provided
    if (Array.isArray(problems)) {
      await supabase.from('coding_battle_problems').delete().eq('battle_id', id);

      if (problems.length > 0) {
        const problemLinks = problems.map((p: any, idx: number) => ({
          battle_id: id,
          problem_id: p.id,
          points: Number(p.points || 100),
          order_index: idx,
        }));
        await supabase.from('coding_battle_problems').insert(problemLinks);
      }
    }

    const { data: updated } = await supabase
      .from('coding_battles')
      .select('*, coding_battle_problems(*, coding_problems(*))')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Battle update failed' } }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('coding_battles')
    .select('id, created_by, status')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  if (existing.created_by !== user.id && !isInstructor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (existing.status === 'LIVE') {
    return NextResponse.json({ error: 'Cannot delete an active battle. End the battle first.' }, { status: 400 });
  }

  await supabase.from('coding_battle_problems').delete().eq('battle_id', id);
  await supabase.from('coding_battle_participants').delete().eq('battle_id', id);
  await supabase.from('coding_battles').delete().eq('id', id);

  return NextResponse.json({ success: true, message: 'Battle deleted' });
}
