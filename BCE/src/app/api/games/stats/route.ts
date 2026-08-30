import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSb = await createAdminClient();

    // 1. Fetch user game stats
    const { data: stats } = await adminSb
      .from('player_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const defaultStats = stats || {
      user_id: user.id,
      rps_played: 0,
      rps_wins: 0,
      rps_losses: 0,
      rps_draws: 0,
      rps_current_streak: 0,
      rps_best_streak: 0,
      ttt_played: 0,
      ttt_wins: 0,
      ttt_losses: 0,
      ttt_draws: 0,
      ttt_current_streak: 0,
      ttt_best_streak: 0
    };

    // 2. Fetch recent completed game sessions
    const { data: recentMatches } = await adminSb
      .from('game_sessions')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: defaultStats,
      recentMatches: recentMatches || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
