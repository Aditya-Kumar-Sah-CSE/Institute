import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';
import { TicTacToeEngine, TTTSymbol } from '@/features/games/engine/TicTacToeEngine';
import { RockPaperScissorsEngine, RPSMove } from '@/features/games/engine/RockPaperScissorsEngine';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, position, choice } = body;

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

    if (session.status !== 'playing') {
      return NextResponse.json({ error: 'Game is not currently active', status: session.status }, { status: 400 });
    }

    const isHost = session.host_id === user.id;
    const isGuest = session.guest_id === user.id;
    const isBot = session.mode === 'bot';

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: 'Not a participant in this game session' }, { status: 403 });
    }

    let state = { ...session.state };
    let nextTurn = session.current_turn;
    let newStatus = session.status;
    let winnerId: string | null = null;
    let isDraw = false;

    // ── TIC-TAC-TOE MOVE LOGIC ─────────────────────────────────────────
    if (session.game_type === 'tic_tac_toe') {
      if (typeof position !== 'number' || position < 0 || position > 8) {
        return NextResponse.json({ error: 'Invalid board position' }, { status: 400 });
      }

      // Check turn
      if (!isBot && session.current_turn !== user.id) {
        return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
      }

      const board = [...(state.board || Array(9).fill(null))];
      if (board[position] !== null) {
        return NextResponse.json({ error: 'Cell is already occupied' }, { status: 400 });
      }

      const playerSymbol: TTTSymbol = isHost ? (session.host_symbol || 'X') : (session.guest_symbol || 'O');
      board[position] = playerSymbol;

      // Evaluate result after player move
      let winResult = TicTacToeEngine.evaluateBoard(board);

      if (winResult.isComplete) {
        newStatus = 'completed';
        isDraw = winResult.isDraw;
        if (winResult.winner) {
          winnerId = winResult.winner === session.host_symbol ? session.host_id : session.guest_id;
        }
        state.board = board;
        state.winner = winResult.winner;
        state.winningLine = winResult.winningLine;
      } else if (isBot) {
        // Execute Bot move immediately
        const botSymbol: TTTSymbol = playerSymbol === 'X' ? 'O' : 'X';
        const botMove = TicTacToeEngine.generateBotMove(board, botSymbol, session.difficulty || 'easy');
        
        if (botMove !== -1) {
          board[botMove] = botSymbol;
        }

        winResult = TicTacToeEngine.evaluateBoard(board);
        if (winResult.isComplete) {
          newStatus = 'completed';
          isDraw = winResult.isDraw;
          if (winResult.winner) {
            winnerId = winResult.winner === session.host_symbol ? session.host_id : null; // Bot winner is null or non-user
          }
          state.winner = winResult.winner;
          state.winningLine = winResult.winningLine;
        }

        state.board = board;
        nextTurn = session.host_id;
      } else {
        // Friend mode turn swap
        state.board = board;
        nextTurn = isHost ? session.guest_id : session.host_id;
      }

      // Record move
      await adminSb.from('game_moves').insert({
        game_id: gameId,
        player_id: user.id,
        round: 1,
        move_data: { position, symbol: playerSymbol }
      });
    }

    // ── ROCK PAPER SCISSORS MOVE LOGIC ──────────────────────────────────
    else if (session.game_type === 'rock_paper_scissors') {
      if (!choice || !['rock', 'paper', 'scissors'].includes(choice)) {
        return NextResponse.json({ error: 'Invalid move choice' }, { status: 400 });
      }

      const playerMove: RPSMove = choice as RPSMove;

      if (isHost) {
        state.hostMove = playerMove;
      } else {
        state.guestMove = playerMove;
      }

      // Bot Mode: generate bot move instantly
      if (isBot) {
        const historyMoves = (state.history || []).map((h: any) => h.hostMove);
        state.guestMove = RockPaperScissorsEngine.generateBotMove(session.difficulty || 'easy', historyMoves);
      }

      // If both moves submitted, resolve round
      if (state.hostMove && state.guestMove) {
        const roundRes = RockPaperScissorsEngine.evaluateRound(state.hostMove, state.guestMove);

        if (roundRes === 'host_win') state.hostScore = (state.hostScore || 0) + 1;
        if (roundRes === 'guest_win') state.guestScore = (state.guestScore || 0) + 1;

        // Push to round history
        const roundSummary = {
          round: state.round || 1,
          hostMove: state.hostMove,
          guestMove: state.guestMove,
          result: roundRes
        };
        state.history = [...(state.history || []), roundSummary];
        state.movesRevealed = true;

        // Check match completion
        const targetWins = session.target_wins || 1;
        const matchRes = RockPaperScissorsEngine.checkMatchWinner(state.hostScore, state.guestScore, targetWins);

        if (matchRes.isComplete) {
          newStatus = 'completed';
          if (matchRes.winner === 'host') winnerId = session.host_id;
          else if (matchRes.winner === 'guest') winnerId = isBot ? null : session.guest_id;
          else isDraw = true;
          state.matchWinner = matchRes.winner;
        } else {
          // Prepare for next round
          state.round = (state.round || 1) + 1;
          // Clear moves for next turn
          state.hostMove = null;
          state.guestMove = null;
        }
      } else {
        state.movesRevealed = false;
      }

      await adminSb.from('game_moves').insert({
        game_id: gameId,
        player_id: user.id,
        round: state.round || 1,
        move_data: { choice: playerMove }
      });
    }

    // Update game session state in DB
    const { data: updatedSession, error: updateErr } = await adminSb
      .from('game_sessions')
      .update({
        state: state,
        current_turn: nextTurn,
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

    // If match completed, execute atomic RPC to finalize stats & match state
    if (newStatus === 'completed') {
      const { data: rpcRes, error: rpcErr } = await adminSb.rpc('finalize_game_match', {
        p_game_id: gameId,
        p_winner_id: winnerId,
        p_is_draw: isDraw,
        p_status: 'completed'
      });

      if (rpcErr) console.error('Finalize RPC error:', rpcErr);

      // Re-fetch updated completed session
      const { data: finalSession } = await adminSb
        .from('game_sessions')
        .select(`
          *,
          host:profiles!host_id(id, name, avatar_url),
          guest:profiles!guest_id(id, name, avatar_url)
        `)
        .eq('id', gameId)
        .single();

      return NextResponse.json({ success: true, session: finalSession || updatedSession });
    }

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
