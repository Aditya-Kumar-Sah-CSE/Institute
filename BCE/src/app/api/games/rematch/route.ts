import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';
import { TicTacToeEngine } from '@/features/games/engine/TicTacToeEngine';

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

    // Reset clean state
    let freshState: any = {};
    if (session.game_type === 'rock_paper_scissors') {
      freshState = {
        round: 1,
        targetWins: session.target_wins || 1,
        hostScore: 0,
        guestScore: 0,
        hostMove: null,
        guestMove: null,
        movesRevealed: false,
        history: []
      };
    } else {
      freshState = {
        board: TicTacToeEngine.createEmptyBoard(),
        turnTimer: 30,
        winner: null,
        winningLine: null
      };
    }

    const { data: updated, error: updateErr } = await adminSb
      .from('game_sessions')
      .update({
        status: 'playing',
        state: freshState,
        winner_id: null,
        forfeited_by: null,
        current_turn: session.host_id,
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
