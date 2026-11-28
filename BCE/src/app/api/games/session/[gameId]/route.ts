import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID parameter missing' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSb = await createAdminClient();

    const { data: session, error } = await adminSb
      .from('game_sessions')
      .select(`
        id, game_type, status, mode, difficulty, target_wins, host_id, guest_id, winner_id, is_draw, state, created_at, updated_at,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .eq('id', gameId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    // Mask unrevealed opponent RPS move so players cannot cheat by polling session
    if (session.game_type === 'rock_paper_scissors' && session.state && !session.state.movesRevealed) {
      const sanitizedState = { ...session.state };
      if (user.id !== session.host_id) sanitizedState.hostMove = sanitizedState.hostMove ? 'hidden' : null;
      if (user.id !== session.guest_id) sanitizedState.guestMove = sanitizedState.guestMove ? 'hidden' : null;
      session.state = sanitizedState;
    }

    return NextResponse.json({ success: true, session });
  } catch {
    return NextResponse.json({ error: 'Failed to load game session' }, { status: 500 });
  }
}
