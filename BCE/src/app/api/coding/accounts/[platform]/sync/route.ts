import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(_: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const platformUpper = platform.toUpperCase();
    const { supabase, user } = await getCodeArenaActor();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (platformUpper !== 'CODEFORCES' && platformUpper !== 'LEETCODE') {
      return NextResponse.json({ error: 'Unsupported platform.' }, { status: 400 });
    }

    // 1. Get connected account
    const { data: account } = await supabase
      .from('student_external_accounts')
      .select('id, username, metadata')
      .eq('student_id', user.id)
      .eq('platform', platformUpper)
      .maybeSingle();

    if (!account || !account.username) {
      return NextResponse.json({ error: `No ${platformUpper} account connected. Connect your handle first.` }, { status: 404 });
    }

    const handle = account.username;

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

      try {
        // Fetch user profile + submit stats using public GraphQL
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
                userContestRanking(username: $username) {
                  rating
                  attendedContestsCount
                  globalRanking
                }
                recentAcSubmissionList(username: $username, limit: 10) {
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
        const contestData = json?.data?.userContestRanking;
        const recentAcs = json?.data?.recentAcSubmissionList;

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

        if (contestData) {
          contestRating = contestData.rating ? Math.round(contestData.rating) : null;
          contestCount = contestData.attendedContestsCount || 0;
        }
      } catch (e: any) {
        console.error('[LC SYNC] Sync failure:', e);
        return NextResponse.json({ error: e.message || 'LeetCode API sync failed.' }, { status: 400 });
      }

      // Update database
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
            contest_stats: {
              rating: contestRating,
              totalContests: contestCount,
            },
          },
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('[LC SYNC] DB update failed:', updateError.message);
        return NextResponse.json({ error: 'Sync completed but failed to save. Try again.' }, { status: 500 });
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
          contest_stats: contestStats,
          max_rank: maxRank
        },
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[CF SYNC] DB update failed:', updateError.message);
      return NextResponse.json({ error: 'Sync completed but failed to save. Try again.' }, { status: 500 });
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
