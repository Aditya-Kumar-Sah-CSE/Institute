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

  return NextResponse.json({ success: true, data: battle });
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
      .select('id, created_by, status')
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
    const { title, description, durationMinutes, batchId, visibility, problems } = body;

    const updates: any = {};
    if (title?.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description || null;
    if (durationMinutes && Number.isInteger(Number(durationMinutes))) {
      updates.duration_minutes = Number(durationMinutes);
    }
    if (visibility) updates.visibility = visibility;
    if (batchId !== undefined) updates.batch_id = batchId || null;

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
