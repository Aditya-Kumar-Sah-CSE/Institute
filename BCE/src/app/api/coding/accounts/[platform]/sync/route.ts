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
      .select('id, username, rating, max_rating, rank')
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
    try {
      const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, { cache: 'no-store' });
      if (infoRes.ok) {
        const infoJson = await infoRes.json();
        const p = infoJson.result?.[0];
        if (p) {
          userRating = p.rating || null;
          userMaxRating = p.maxRating || null;
          userRank = p.rank || null;
        }
      }
    } catch (e) {
      console.warn('[CF SYNC] user.info failed:', e);
    }

    // 3. Fetch submission history (last 500 accepted)
    const solvedIds: string[] = [];
    let totalSolved = 0;
    try {
      const statusRes = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
        { cache: 'no-store' }
      );
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.status === 'OK' && Array.isArray(statusJson.result)) {
          const accepted = new Set<string>();
          for (const sub of statusJson.result) {
            if (sub.verdict === 'OK' && sub.problem?.contestId && sub.problem?.index) {
              const id = `${sub.problem.contestId}${sub.problem.index}`;
              accepted.add(id);
            }
          }
          solvedIds.push(...Array.from(accepted));
          totalSolved = accepted.size;
        }
      }
    } catch (e) {
      console.warn('[CF SYNC] user.status failed:', e);
    }

    // 4. Update account with synced data
    const { error: updateError } = await supabase
      .from('student_external_accounts')
      .update({
        rating: userRating,
        max_rating: userMaxRating,
        rank: userRank,
        problems_solved: totalSolved,
        cf_solved_ids: solvedIds.length > 0 ? solvedIds : null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[CF SYNC] DB update failed:', updateError);
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
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[CF SYNC] Unhandled error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed unexpectedly.' }, { status: 500 });
  }
}
