import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, readyState = true } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const adminSb = await createAdminClient();

    const { data: session, error: fetchErr } = await adminSb
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    const isHost = session.host_id === user.id;
    const isGuest = session.guest_id === user.id;

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: 'You are not a participant in this game' }, { status: 403 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (isHost) updatePayload.host_ready = readyState;
    if (isGuest) updatePayload.guest_ready = readyState;

    const hostReady = isHost ? readyState : session.host_ready;
    const guestReady = isGuest ? readyState : session.guest_ready;

    if (hostReady && guestReady && session.guest_id) {
      updatePayload.status = 'playing';
      updatePayload.current_turn = session.host_id; // Host starts
    }

    const { data: updated, error: updateErr } = await adminSb
      .from('game_sessions')
      .update(updatePayload)
      .eq('id', gameId)
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
