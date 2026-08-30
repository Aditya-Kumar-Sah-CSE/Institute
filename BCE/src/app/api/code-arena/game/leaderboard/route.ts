import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'infinite'; // 'challenge' or 'infinite'
    const period = searchParams.get('period') || 'all'; // 'daily', 'weekly', 'all'

    if (!['challenge', 'infinite'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const adminSb = await createAdminClient();
    let dateFilter: string | null = null;
    
    const now = new Date();
    if (period === 'daily') {
      const dailyDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFilter = dailyDate.toISOString();
    } else if (period === 'weekly') {
      const weeklyDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = weeklyDate.toISOString();
    }

    // Prepare query for leaderboard
    let query = adminSb
      .from('breaker_leaderboard')
      .select(`
        user_id,
        score,
        level,
        wave,
        survival_time,
        created_at,
        profiles!inner (
          name,
          avatar_url,
          is_verified,
          last_login_at
        )
      `)
      .eq('mode', mode)
      .eq('profiles.is_verified', true)
      .not('profiles.last_login_at', 'is', null);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data: rawLeaderboard, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Process and aggregate high scores per user
    const userScoresMap = new Map<string, any>();
    
    rawLeaderboard.forEach((entry: any) => {
      const uid = entry.user_id;
      const profile = entry.profiles || { name: 'Player', avatar_url: null };
      
      if (mode === 'challenge') {
        // For challenge, aggregate best scores per level
        if (!userScoresMap.has(uid)) {
          userScoresMap.set(uid, {
            user_id: uid,
            name: profile.name,
            avatar_url: profile.avatar_url,
            level_scores: new Map<number, number>(),
            survival_time: 0,
            last_created_at: entry.created_at
          });
        }
        const userObj = userScoresMap.get(uid);
        const currentLvl = entry.level || 1;
        const currentLvlMax = userObj.level_scores.get(currentLvl) || 0;
        
        if (entry.score > currentLvlMax) {
          userObj.level_scores.set(currentLvl, entry.score);
        }
        userObj.survival_time += entry.survival_time;
        if (new Date(entry.created_at) > new Date(userObj.last_created_at)) {
          userObj.last_created_at = entry.created_at;
        }
      } else {
        // For infinite, fetch single highest score overall
        const currentMax = userScoresMap.get(uid)?.score || 0;
        if (entry.score > currentMax) {
          userScoresMap.set(uid, {
            user_id: uid,
            name: profile.name,
            avatar_url: profile.avatar_url,
            score: entry.score,
            wave: entry.wave || 1,
            survival_time: entry.survival_time,
            created_at: entry.created_at
          });
        }
      }
    });

    // Flatten and convert aggregated user scores to list
    let leaderboardList: any[] = [];
    userScoresMap.forEach((val, key) => {
      if (mode === 'challenge') {
        let totalScore = 0;
        let highestLevelCompleted = 0;
        val.level_scores.forEach((sc: number, lvl: number) => {
          totalScore += sc;
          highestLevelCompleted = Math.max(highestLevelCompleted, lvl);
        });
        
        leaderboardList.push({
          user_id: key,
          name: val.name,
          avatar_url: val.avatar_url,
          score: totalScore,
          level: highestLevelCompleted,
          survival_time: val.survival_time,
          created_at: val.last_created_at
        });
      } else {
        leaderboardList.push(val);
      }
    });

    // Sort: score DESC, survival_time ASC (longer survival for same score is better or vice-versa, here higher score first)
    leaderboardList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.survival_time - b.survival_time; // faster completes/survivals take priority
    });

    // Append rank fields
    leaderboardList = leaderboardList.map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));

    // Slice to Top 50
    const top50 = leaderboardList.slice(0, 50);

    // Find current user rank
    const userRankInfo = leaderboardList.find(entry => entry.user_id === user.id) || null;

    return NextResponse.json({
      success: true,
      leaderboard: top50,
      userRank: userRankInfo
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
