import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { fetchCodeChefUserProfile } from '@/lib/coding-platforms/codechef';

export async function POST(_: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const platformUpper = platform.toUpperCase();
    const { supabase, user } = await getCodeArenaActor();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (platformUpper !== 'CODEFORCES' && platformUpper !== 'LEETCODE' && platformUpper !== 'CODECHEF') {
      return NextResponse.json({ error: 'Unsupported platform.' }, { status: 400 });
    }

    // 1. Get connected account
    const { data: account } = await supabase
      .from('student_external_accounts')
      .select('id, username, metadata, problems_solved')
      .eq('student_id', user.id)
      .eq('platform', platformUpper)
      .maybeSingle();

    if (!account || !account.username) {
      return NextResponse.json({ error: `No ${platformUpper} account connected. Connect your handle first.` }, { status: 404 });
    }

    const handle = account.username;

    // ==================== CODECHEF SYNC ====================
    if (platformUpper === 'CODECHEF') {
      const ccProfile = await fetchCodeChefUserProfile(handle);

      const prevSolved = account.problems_solved || 0;
      const currentSolved = ccProfile.totalSolved;
      const delta = currentSolved - prevSolved;

      if (delta > 0) {
        const completedRows = [];
        for (let i = 0; i < delta; i++) {
          completedRows.push({
            student_id: user.id,
            platform: 'CODECHEF',
            problem_id: `codechef_${prevSolved + i + 1}`,
            solved_at: prevSolved === 0 ? new Date(0).toISOString() : new Date().toISOString(),
          });
        }
        await supabase
          .from('student_completed_problems')
          .upsert(completedRows, { onConflict: 'student_id,platform,problem_id' });
      }

      const existingMetadata = account.metadata || {};
      const { error: updateError } = await supabase
        .from('student_external_accounts')
        .update({
          rating: ccProfile.rating,
          max_rating: ccProfile.maxRating,
          rank: ccProfile.starsLabel,
          problems_solved: ccProfile.totalSolved,
          easy_solved: ccProfile.easySolved,
          medium_solved: ccProfile.mediumSolved,
          hard_solved: ccProfile.hardSolved,
          last_synced_at: new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            stars: ccProfile.stars,
            stars_label: ccProfile.starsLabel,
            global_rank: ccProfile.globalRank,
            country_rank: ccProfile.countryRank,
          },
        })
        .eq('id', account.id);

      if (updateError) {
        return NextResponse.json({ error: 'Sync completed but failed to save. Try again.' }, { status: 500 });
      }

      // Trigger badge evaluation
      try {
        const { checkBadges } = await import('@/features/gamification/actions/gamification');
        await checkBadges(user.id);
      } catch (badgeErr) {
        console.error('[CODECHEF BADGES] Failed to calculate badges:', badgeErr);
      }

      return NextResponse.json({
        success: true,
        data: {
          handle,
          rating: ccProfile.rating,
          maxRating: ccProfile.maxRating,
          rank: ccProfile.starsLabel,
          problemsSolved: ccProfile.totalSolved,
          easySolved: ccProfile.easySolved,
          mediumSolved: ccProfile.mediumSolved,
          hardSolved: ccProfile.hardSolved,
          syncedAt: new Date().toISOString(),
        },
      });
    }

    // ==================== LEETCODE SYNC ====================
    if (platformUpper === 'LEETCODE') {
      let totalSolved = 0;
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;
      let ranking: number | null = null;
      let contestRating: number | null = null;
      let contestCount = 0;
      const recentSubmissions: any[] = [];
      let recentAcs: any[] = [];

      // 1. Fetch user profile + submit stats using public GraphQL (Main Profile Query)
      try {
        const profileRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            Referer: 'https://leetcode.com/',
          },
          body: JSON.stringify({
            query: `
              query getUserProfile($username: String!) {
                matchedUser(username: $username) {
                  username
                  profile {
                    ranking
                  }
                  submitStats: submitStatsGlobal {
                    acSubmissionNum {
                      difficulty
                      count
                    }
                  }
                }
                recentAcSubmissionList(username: $username, limit: 50) {
                  title
                  titleSlug
                  timestamp
                  lang
                }
              }
            `,
            variables: { username: handle },
          }),
        });

        if (!profileRes.ok) {
          throw new Error(`LeetCode GraphQL request failed (Status: ${profileRes.status}).`);
        }

        const json = await profileRes.json();
        if (json.errors && json.errors.length > 0) {
          throw new Error(`LeetCode error: ${json.errors[0].message}`);
        }

        const lcUser = json?.data?.matchedUser;
        recentAcs = json?.data?.recentAcSubmissionList || [];

        if (!lcUser) {
          throw new Error(`LeetCode user account "${handle}" not found.`);
        }

        const acStats = lcUser.submitStats?.acSubmissionNum || [];
        totalSolved = acStats.find((s: any) => s.difficulty === 'All')?.count || 0;
        easySolved = acStats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
        mediumSolved = acStats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
        hardSolved = acStats.find((s: any) => s.difficulty === 'Hard')?.count || 0;
        ranking = lcUser.profile?.ranking || null;

        // Recent AC submissions mapping
        if (Array.isArray(recentAcs)) {
          for (const sub of recentAcs) {
            recentSubmissions.push({
              problem: sub.title,
              slug: sub.titleSlug,
              verdict: 'OK',
              language: sub.lang,
              time: Number(sub.timestamp) * 1000,
            });
          }
        }
      } catch (e: any) {
        console.error('[LC SYNC] Main profile fetch failed:', e);
        return NextResponse.json({ error: e.message || 'LeetCode profile verification failed.' }, { status: 400 });
      }

      // 2. Fetch submission calendar (Optional)
      const lcDaily: Record<string, number> = {};
      try {
        const calendarRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            Referer: 'https://leetcode.com/',
          },
          body: JSON.stringify({
            query: `
              query userProfileCalendar($username: String!) {
                matchedUser(username: $username) {
                  userCalendar {
                    submissionCalendar
                  }
                }
              }
            `,
            variables: { username: handle },
          }),
        });

        if (calendarRes.ok) {
          const calJson = await calendarRes.json();
          const calendarStr = calJson?.data?.matchedUser?.userCalendar?.submissionCalendar || '{}';
          const calendarJsonObj = JSON.parse(calendarStr);
          Object.entries(calendarJsonObj).forEach(([timestampStr, count]) => {
            const ms = Number(timestampStr) * 1000;
            const dateStr = new Date(ms).toISOString().slice(0, 10);
            lcDaily[dateStr] = (lcDaily[dateStr] || 0) + Number(count);
          });
        }
      } catch (err) {
        console.warn('[LC SYNC] Calendar query failed, using empty calendar:', err);
      }

      // 3. Fetch LeetCode Contest Stats & History (Optional)
      let contestStatsObj: any = {};
      let contestHistoryArr: any[] = [];
      try {
        const contestRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            Referer: 'https://leetcode.com/',
          },
          body: JSON.stringify({
            query: `
              query userContestRankingInfo($username: String!) {
                userContestRanking(username: $username) {
                  rating
                  attendedContestsCount
                  globalRanking
                  totalParticipants
                  topPercentage
                }
                userContestRankingHistory(username: $username) {
                  attended
                  rating
                  ranking
                  contest {
                    title
                    startTime
                  }
                }
              }
            `,
            variables: { username: handle },
          }),
        });

        if (contestRes.ok) {
          const contestJson = await contestRes.json();
          const contestData = contestJson?.data?.userContestRanking;
          if (contestData) {
            contestRating = contestData.rating ? Math.round(contestData.rating) : null;
            contestCount = contestData.attendedContestsCount || 0;
            contestStatsObj = {
              rating: contestRating,
              totalContests: contestCount,
              globalRanking: contestData.globalRanking || null,
              totalParticipants: contestData.totalParticipants || null,
              topPercentage: contestData.topPercentage || null,
              ratingDistribution: [],
            };
          }
          contestHistoryArr = contestJson?.data?.userContestRankingHistory || [];
        }
      } catch (err) {
        console.warn('[LC SYNC] Contest stats query failed, using mock fallbacks:', err);
      }

      // Update database
      try {
        const existingMetadata = account.metadata || {};
        const { error: updateError } = await supabase
          .from('student_external_accounts')
          .update({
            rating: contestRating,
            rank: ranking ? `#${ranking}` : null,
            problems_solved: totalSolved,
            easy_solved: easySolved,
            medium_solved: mediumSolved,
            hard_solved: hardSolved,
            last_synced_at: new Date().toISOString(),
            metadata: {
              ...existingMetadata,
              recent_submissions: recentSubmissions,
              lc_daily_activity: lcDaily,
              contest_stats: Object.keys(contestStatsObj).length > 0 ? contestStatsObj : existingMetadata.contest_stats || {},
              contest_history: contestHistoryArr.length > 0 ? contestHistoryArr : existingMetadata.contest_history || [],
            },
          })
          .eq('id', account.id);

        if (updateError) {
          console.error('[LC SYNC] DB update failed:', updateError.message);
          return NextResponse.json({ error: 'Sync completed but failed to save. Try again.' }, { status: 500 });
        }

        // Upsert matching recent submissions into student_completed_problems
        if (Array.isArray(recentAcs) && recentAcs.length > 0) {
          const completedRows = recentAcs.map((sub: any) => ({
            student_id: user.id,
            platform: 'LEETCODE',
            problem_id: sub.titleSlug || sub.title,
            solved_at: new Date(Number(sub.timestamp) * 1000).toISOString(),
          }));
          await supabase
            .from('student_completed_problems')
            .upsert(completedRows, { onConflict: 'student_id,platform,problem_id' });
        }

        // Trigger badge evaluation
        try {
          const { checkBadges } = await import('@/features/gamification/actions/gamification');
          await checkBadges(user.id);
        } catch (badgeErr) {
          console.error('[LEETCODE BADGES] Failed to calculate badges:', badgeErr);
        }

        return NextResponse.json({
          success: true,
          data: {
            handle,
            rating: contestRating,
            maxRating: null,
            rank: ranking ? `#${ranking}` : null,
            problemsSolved: totalSolved,
            easySolved,
            mediumSolved,
            hardSolved,
            syncedAt: new Date().toISOString(),
          },
        });
      } catch (e: any) {
        console.error('[LC SYNC] Database update failed:', e);
        return NextResponse.json({ error: e.message || 'Sync failed to save.' }, { status: 500 });
      }
    }

    // ==================== CODEFORCES SYNC ====================
    let userRating: number | null = null;
    let userMaxRating: number | null = null;
    let userRank: string | null = null;
    let maxRank: string | null = null;
    try {
      const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, { cache: 'no-store' });
      if (!infoRes.ok) {
        throw new Error(`Codeforces Profile Fetch returned status ${infoRes.status}`);
      }
      const infoJson = await infoRes.json();
      if (infoJson.status !== 'OK' || !infoJson.result || !infoJson.result[0]) {
        throw new Error(infoJson.comment || 'Failed to fetch Codeforces user info.');
      }
      const p = infoJson.result[0];
      userRating = p.rating || null;
      userMaxRating = p.maxRating || null;
      userRank = p.rank || null;
      maxRank = p.maxRank || null;
    } catch (e: any) {
      console.error('[CF SYNC] user.info failed:', e);
      return NextResponse.json({ error: e.message || 'Failed to fetch Codeforces profile.' }, { status: 400 });
    }

    // Fetch submission history
    const solvedIds = new Set<string>();
    let totalSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;
    const recentSubmissions: any[] = [];
    const cfDaily: Record<string, number> = {};

    try {
      const statusRes = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
        { cache: 'no-store' }
      );
      if (!statusRes.ok) {
        throw new Error(`Codeforces Submissions Fetch returned status ${statusRes.status}`);
      }
      const statusJson = await statusRes.json();
      if (statusJson.status !== 'OK' || !Array.isArray(statusJson.result)) {
        throw new Error(statusJson.comment || 'Failed to fetch Codeforces status.');
      }

      recentSubmissions.push(...statusJson.result.slice(0, 10).map((s: any) => ({
        id: s.id,
        problem: s.problem ? `${s.problem.contestId}${s.problem.index} — ${s.problem.name}` : 'Unknown Problem',
        verdict: s.verdict,
        language: s.programmingLanguage,
        time: s.creationTimeSeconds * 1000
      })));

      for (const sub of statusJson.result) {
        if (sub.verdict === 'OK' && sub.problem?.contestId && sub.problem?.index) {
          const id = `${sub.problem.contestId}${sub.problem.index}`;
          if (!solvedIds.has(id)) {
            solvedIds.add(id);
            if (sub.problem.rating) {
              if (sub.problem.rating < 1200) easySolved++;
              else if (sub.problem.rating <= 1600) mediumSolved++;
              else hardSolved++;
            }
          }
          // Collect daily solve counts
          if (sub.creationTimeSeconds) {
            const dateStr = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10);
            cfDaily[dateStr] = (cfDaily[dateStr] || 0) + 1;
          }
        }
      }
      totalSolved = solvedIds.size;
    } catch (e: any) {
      console.error('[CF SYNC] user.status failed:', e);
      return NextResponse.json({ error: e.message || 'Failed to fetch Codeforces submissions.' }, { status: 400 });
    }

    // Fetch Rating History (Optional, won't fail parent sync)
    const contestStats = { totalContests: 0, ratingHistory: [] as any[] };
    try {
      const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`, { cache: 'no-store' });
      if (ratingRes.ok) {
        const ratingJson = await ratingRes.json();
        if (ratingJson.status === 'OK' && Array.isArray(ratingJson.result)) {
          contestStats.totalContests = ratingJson.result.length;
          contestStats.ratingHistory = ratingJson.result.slice(-15).map((r: any) => ({
            contestId: r.contestId,
            contestName: r.contestName,
            rank: r.rank,
            oldRating: r.oldRating,
            newRating: r.newRating,
            updateTime: r.ratingUpdateTimeSeconds * 1000
          }));
        }
      }
    } catch (e) {
      console.warn('[CF SYNC] user.rating failed:', e);
    }

    // Update account
    const existingMetadata = account.metadata || {};
    const { error: updateError } = await supabase
      .from('student_external_accounts')
      .update({
        rating: userRating,
        max_rating: userMaxRating,
        rank: userRank,
        problems_solved: totalSolved,
        easy_solved: easySolved,
        medium_solved: mediumSolved,
        hard_solved: hardSolved,
        last_synced_at: new Date().toISOString(),
        metadata: {
          ...existingMetadata,
          cf_solved_ids: Array.from(solvedIds),
          recent_submissions: recentSubmissions,
          cf_daily_activity: cfDaily,
          contest_stats: contestStats,
          max_rank: maxRank
        },
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[CF SYNC] DB update failed:', updateError.message);
      return NextResponse.json({ error: 'Sync completed but failed to save. Try again.' }, { status: 500 });
    }

    // Trigger badge evaluation
    try {
      const { checkBadges } = await import('@/features/gamification/actions/gamification');
      await checkBadges(user.id);
    } catch (badgeErr) {
      console.error('[CODEFORCES BADGES] Failed to calculate badges:', badgeErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        handle,
        rating: userRating,
        maxRating: userMaxRating,
        rank: userRank,
        problemsSolved: totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[SYNC] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed unexpectedly.' }, { status: 500 });
  }
}
