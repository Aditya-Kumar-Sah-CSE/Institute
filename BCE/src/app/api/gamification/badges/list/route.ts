import { createClient } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api/api-utils';

export const GET = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (_request, ctx) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return ctx.error('Unauthorized', 'UNAUTHORIZED', 401);

    // 1. Fetch available badges definitions
    const { data: allBadges, error: badgeErr } = await supabase
      .from('badges')
      .select('*')
      .order('name', { ascending: true });

    if (badgeErr) {
      console.error('[BADGES API] Failed to fetch badge definitions:', badgeErr);
      return ctx.error('Failed to load badges definitions', 'DATABASE_ERROR', 500);
    }

    // 2. Fetch user's earned badges
    const { data: userBadges, error: userBadgeErr } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', user.id);

    if (userBadgeErr) {
      console.error('[BADGES API] Failed to fetch user badges:', userBadgeErr);
      return ctx.error('Failed to load user achievements', 'DATABASE_ERROR', 500);
    }

    // 3. Retrieve student completed problems
    const { data: completedProblems, error: problemsErr } = await supabase
      .from('student_completed_problems')
      .select('problem_id, platform, solved_at')
      .eq('student_id', user.id);

    if (problemsErr) {
      console.error('[BADGES API] Failed to fetch solved problems:', problemsErr);
      return ctx.error('Failed to query solved problems', 'DATABASE_ERROR', 500);
    }

    const items = completedProblems || [];

    // Precalculate Stats
    const totalSolved = items.length;
    const uniquePlatforms = new Set(items.map(i => i.platform));
    const platformsCount = uniquePlatforms.size;

    // Filter distinct solved dates
    const dateStrings = Array.from(
      new Set(
        items.map(i => {
          try {
            return new Date(i.solved_at).toISOString().slice(0, 10);
          } catch (e) {
            return null;
          }
        }).filter(Boolean)
      )
    ).sort();

    const uniqueDaysCount = dateStrings.length;

    // Calculate max consecutive streak from dates
    let maxStreak = 0;
    let currentStreak = 0;
    let prevDateStr: string | null = null;

    dateStrings.forEach((dateStr) => {
      const dateVal = dateStr as string;
      if (!prevDateStr) {
        currentStreak = 1;
      } else {
        const prev = new Date(prevDateStr);
        const curr = new Date(dateVal);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      prevDateStr = dateVal;
    });

    // Check completed DSA sheets count
    const { count: dsaSheetsCount } = await supabase
      .from('coding_sheet_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .gte('progress', 1.0);

    // Retrieve best rank from month rewards
    const { data: rewards } = await supabase
      .from('monthly_rewards')
      .select('rank')
      .eq('user_id', user.id);

    const bestRank = rewards && rewards.length > 0 ? Math.min(...rewards.map(r => r.rank)) : 9999;

    // Check coding battles/contests joined
    const { count: contestsJoined } = await supabase
      .from('coding_battle_participants')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id);

    // Fetch difficulty breakdowns of Smart Learn solved files
    const slProblemIds = items
      .filter(i => i.platform === 'SMART_LEARN')
      .map(i => i.problem_id);

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    if (slProblemIds.length > 0) {
      const { data: problems } = await supabase
        .from('coding_problems')
        .select('difficulty')
        .in('id', slProblemIds);
        
      problems?.forEach(p => {
        if (p.difficulty === 'EASY') easySolved++;
        else if (p.difficulty === 'MEDIUM') mediumSolved++;
        else if (p.difficulty === 'HARD') hardSolved++;
      });
    }

    const currentStats = {
      maxStreak,
      totalSolved,
      uniqueDaysCount,
      dsaSheetsCount: dsaSheetsCount || 0,
      platformsCount,
      bestRank,
      contestsJoined: contestsJoined || 0,
      easySolved,
      mediumSolved,
      hardSolved
    };

    return ctx.success({
      badges: allBadges,
      earned: userBadges,
      stats: currentStats
    });
  }
);
