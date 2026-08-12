import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(_: Request, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const platformUpper = platform.toUpperCase();
    const { supabase, user } = await getCodeArenaActor();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (platformUpper === 'LEETCODE') {
      return NextResponse.json({ error: 'LeetCode sync is not yet available. No officially supported public API exists.' }, { status: 501 });
    }

    if (platformUpper !== 'CODEFORCES') {
      return NextResponse.json({ error: 'Unsupported platform.' }, { status: 400 });
    }

    // 1. Get connected account
    const { data: account } = await supabase
      .from('student_external_accounts')
      .select('id, username, metadata')
      .eq('student_id', user.id)
      .eq('platform', 'CODEFORCES')
      .maybeSingle();

    if (!account || !account.username) {
      return NextResponse.json({ error: 'No Codeforces account connected. Connect your handle first.' }, { status: 404 });
    }

    const handle = account.username;

    // 2. Fetch latest user info
    let userRating: number | null = null;
    let userMaxRating: number | null = null;
    let userRank: string | null = null;
    let maxRank: string | null = null;
    try {
      const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, { cache: 'no-store' });
      if (infoRes.ok) {
        const infoJson = await infoRes.json();
        const p = infoJson.result?.[0];
        if (p) {
          userRating = p.rating || null;
          userMaxRating = p.maxRating || null;
          userRank = p.rank || null;
          maxRank = p.maxRank || null;
        }
      }
    } catch (e) {
      console.warn('[CF SYNC] user.info failed:', e);
    }

    // 3. Fetch submission history + extract solved IDs + recent + difficulties
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
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.status === 'OK' && Array.isArray(statusJson.result)) {
          // Extract recent 10 submissions
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
                // Difficulty logic based on rating
                if (sub.problem.rating) {
                  if (sub.problem.rating < 1200) easySolved++;
                  else if (sub.problem.rating <= 1600) mediumSolved++;
                  else hardSolved++;
                }
              }
            }
          }
          totalSolved = solvedIds.size;
        }
      }
    } catch (e) {
      console.warn('[CF SYNC] user.status failed:', e);
    }

    // 4. Fetch Rating History / Contests
    const contestStats = { totalContests: 0, ratingHistory: [] as any[] };
    try {
      const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`, { cache: 'no-store' });
      if (ratingRes.ok) {
        const ratingJson = await ratingRes.json();
        if (ratingJson.status === 'OK' && Array.isArray(ratingJson.result)) {
          contestStats.totalContests = ratingJson.result.length;
          // Keep the last 15 contests for the graph to prevent gigantic JSONs
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

    // 5. Update account with synced data in database
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
    console.error('[CF SYNC] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed unexpectedly.' }, { status: 500 });
  }
}
