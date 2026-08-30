import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const adminSb = await createAdminClient();

    // 1. Fetch game session
    const { data: session, error: fetchErr } = await adminSb
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    // Validation 1: Prevent joining own game
    if (session.host_id === user.id) {
      return NextResponse.json({ 
        error: 'You are the host of this game', 
        isHost: true,
        session 
      }, { status: 200 });
    }

    // Validation 2: If guest is already set to current user, return success
    if (session.guest_id === user.id) {
      return NextResponse.json({ success: true, session });
    }

    // Validation 3: Prevent joining full / already completed / expired games
    if (session.status !== 'waiting' || session.guest_id) {
      return NextResponse.json({ 
        error: 'Game is full, expired, or already in progress',
        status: session.status 
      }, { status: 400 });
    }

    // Update guest assignment & status to ready
    const { data: updated, error: updateErr } = await adminSb
      .from('game_sessions')
      .update({
        guest_id: user.id,
        status: 'ready',
        guest_ready: false,
        updated_at: new Date().toISOString()
      })
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
