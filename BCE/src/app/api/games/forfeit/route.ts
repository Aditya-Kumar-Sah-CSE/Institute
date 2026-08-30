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
      return NextResponse.json({ error: 'Not a participant in this game session' }, { status: 403 });
    }

    if (session.status === 'completed' || session.status === 'forfeited') {
      return NextResponse.json({ success: true, session });
    }

    const winnerId = isHost ? session.guest_id : session.host_id;

    // Call atomic RPC
    await adminSb.rpc('finalize_game_match', {
      p_game_id: gameId,
      p_winner_id: winnerId,
      p_is_draw: false,
      p_status: 'forfeited'
    });

    // Update forfeited_by
    const { data: finalSession } = await adminSb
      .from('game_sessions')
      .update({
        forfeited_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .single();

    return NextResponse.json({ success: true, session: finalSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
