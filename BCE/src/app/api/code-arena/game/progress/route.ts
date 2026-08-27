import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSb = await createAdminClient();

    // 1. Fetch user progress
    let { data: progress, error: progError } = await adminSb
      .from('breaker_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch user profile coins and XP
    const { data: profile, error: profError } = await adminSb
      .from('profiles')
      .select('xp, coins, level')
      .eq('id', user.id)
      .single();

    if (profError) {
      return NextResponse.json({ error: profError.message }, { status: 400 });
    }

    // 3. Initialize default progress if not found
    if (!progress) {
      const defaultProgress = {
        user_id: user.id,
        unlocked_levels: [1],
        level_scores: {},
        stars: {},
        completed_levels: [],
        highest_wave: 0,
        best_infinite_score: 0,
        daily_streak: 0,
        last_played_date: null,
        current_hearts: 3,
        achievements: [],
        milestones: []
      };

      const { data: newProgress, error: insertError } = await adminSb
        .from('breaker_progress')
        .insert(defaultProgress)
        .select('*')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
      progress = newProgress;
    }

    // Return combined payload
    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        xp: profile?.xp || 0,
        coins: profile?.coins || 0,
        userLevel: profile?.level || 'Beginner'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
