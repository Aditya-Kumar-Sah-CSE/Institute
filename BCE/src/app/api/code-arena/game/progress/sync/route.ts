import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSb = await createAdminClient();
    const body = await req.json();
    const { 
      levelScores = {}, 
      stars = {}, 
      completedLevels = [], 
      unlockedLevels = [1],
      highestWave = 0, 
      bestInfiniteScore = 0, 
      achievements = [], 
      milestones = [] 
    } = body;

    // 1. Fetch server progress
    const { data: serverProg, error: fetchError } = await adminSb
      .from('breaker_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    // 2. Perform merging logic (keeping best of both)
    const mergedProgress = serverProg ? { ...serverProg } : {
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

    // Merge level scores
    const mergedScores = { ...(mergedProgress.level_scores || {}) };
    Object.keys(levelScores).forEach(lvl => {
      const lvlNum = parseInt(lvl);
      mergedScores[lvlNum] = Math.max(mergedScores[lvlNum] || 0, levelScores[lvl] || 0);
    });

    // Merge stars
    const mergedStars = { ...(mergedProgress.stars || {}) };
    Object.keys(stars).forEach(lvl => {
      const lvlNum = parseInt(lvl);
      mergedStars[lvlNum] = Math.max(mergedStars[lvlNum] || 0, stars[lvl] || 0);
    });

    // Merge completed levels
    const mergedCompletedSet = new Set<number>([
      ...(mergedProgress.completed_levels || []),
      ...completedLevels
    ]);

    // Merge unlocked levels
    const mergedUnlockedSet = new Set<number>([
      ...(mergedProgress.unlocked_levels || [1]),
      ...unlockedLevels
    ]);

    // Merge infinite wave and score
    const mergedHighestWave = Math.max(mergedProgress.highest_wave || 0, highestWave || 0);
    const mergedBestInfiniteScore = Math.max(mergedProgress.best_infinite_score || 0, bestInfiniteScore || 0);

    // Merge achievements and milestones
    const mergedAchievementsSet = new Set<string>([
      ...(mergedProgress.achievements || []),
      ...achievements
    ]);

    const mergedMilestonesSet = new Set<string>([
      ...(mergedProgress.milestones || []),
      ...milestones
    ]);

    // 3. Upsert merged state
    const { data: updatedProgress, error: upsertError } = await adminSb
      .from('breaker_progress')
      .upsert({
        user_id: user.id,
        unlocked_levels: Array.from(mergedUnlockedSet),
        level_scores: mergedScores,
        stars: mergedStars,
        completed_levels: Array.from(mergedCompletedSet),
        highest_wave: mergedHighestWave,
        best_infinite_score: mergedBestInfiniteScore,
        achievements: Array.from(mergedAchievementsSet),
        milestones: Array.from(mergedMilestonesSet),
        current_hearts: mergedProgress.current_hearts, // keep hearts server side primarily
        daily_streak: mergedProgress.daily_streak,
        last_played_date: mergedProgress.last_played_date,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
