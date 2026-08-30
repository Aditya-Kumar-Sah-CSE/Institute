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
    const { 
      gameType, 
      mode = 'friend', 
      difficulty = 'easy', 
      targetWins = 1 
    } = body;

    if (!gameType || !['rock_paper_scissors', 'tic_tac_toe'].includes(gameType)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    const adminSb = await createAdminClient();
    const isBot = mode === 'bot';

    // Initial state based on game type
    let initialState: any = {};
    if (gameType === 'rock_paper_scissors') {
      initialState = {
        round: 1,
        targetWins: [1, 3, 5].includes(targetWins) ? targetWins : 1,
        hostScore: 0,
        guestScore: 0,
        hostMove: null,
        guestMove: null,
        movesRevealed: false,
        history: []
      };
    } else {
      initialState = {
        board: TicTacToeEngine.createEmptyBoard(),
        turnTimer: 30,
        winner: null,
        winningLine: null
      };
    }

    const status = isBot ? 'playing' : 'waiting';
    const hostSymbol = 'X';
    const guestSymbol = 'O';

    const { data: session, error } = await adminSb
      .from('game_sessions')
      .insert({
        game_type: gameType,
        mode: mode,
        difficulty: isBot ? difficulty : null,
        target_wins: gameType === 'rock_paper_scissors' ? targetWins : 1,
        host_id: user.id,
        guest_id: isBot ? null : null,
        host_symbol: hostSymbol,
        guest_symbol: guestSymbol,
        current_turn: user.id,
        status: status,
        host_ready: isBot,
        guest_ready: isBot,
        state: initialState
      })
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Create game error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      gameId: session.id,
      session
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
