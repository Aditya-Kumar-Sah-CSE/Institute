import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { fetchCodeChefUserProfile } from '@/lib/coding-platforms/codechef';

export async function GET() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('student_external_accounts')
    .select('id,platform,username,profile_url,rating,max_rating,rank,problems_solved,easy_solved,medium_solved,hard_solved,is_public,last_synced_at,metadata')
    .eq('student_id', user.id);

  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, username, isPublic = false } = await request.json();

  if (!['CODEFORCES', 'LEETCODE', 'CODECHEF'].includes(platform) || !String(username || '').match(/^[A-Za-z0-9_-]{1,64}$/)) {
    return NextResponse.json({ error: 'Enter a valid public handle.' }, { status: 400 });
  }

  try {
    if (platform === 'CODEFORCES') {
      const response = await fetch(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`,
        { cache: 'no-store' }
      );
      const json = await response.json();
      const p = json.result?.[0];
      if (!response.ok || !p) throw new Error('Public Codeforces profile not found.');

      const data = {
        student_id: user.id,
        platform,
        username: p.handle,
        external_user_id: String(p.handle),
        profile_url: `https://codeforces.com/profile/${p.handle}`,
        rating: p.rating || null,
        max_rating: p.maxRating || null,
        rank: p.rank || null,
        is_public: Boolean(isPublic),
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('student_external_accounts')
        .upsert(data, { onConflict: 'student_id,platform' });

      return error
        ? NextResponse.json({ error: error.message }, { status: 400 })
        : NextResponse.json({ data });
    }

    if (platform === 'LEETCODE') {
      // Verify the LeetCode username exists via their public GraphQL API
      const graphqlRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: `https://leetcode.com/${username}/`,
        },
        body: JSON.stringify({
          query: `
            query getUserProfile($username: String!) {
              matchedUser(username: $username) {
                username
                profile {
                  realName
                  ranking
                }
                submitStats: submitStatsGlobal {
                  acSubmissionNum {
                    difficulty
                    count
                  }
                }
              }
            }
          `,
          variables: { username },
        }),
      });

      if (!graphqlRes.ok) {
        throw new Error('Could not reach LeetCode. Try again later.');
      }

      const graphqlJson = await graphqlRes.json();
      const lcUser = graphqlJson?.data?.matchedUser;

      if (!lcUser) {
        throw new Error(`LeetCode user "${username}" not found. Please check the handle.`);
      }

      // Extract problem stats
      const acStats = lcUser.submitStats?.acSubmissionNum || [];
      const totalSolved = acStats.find((s: any) => s.difficulty === 'All')?.count || 0;
      const easySolved = acStats.find((s: any) => s.difficulty === 'Easy')?.count || 0;
      const mediumSolved = acStats.find((s: any) => s.difficulty === 'Medium')?.count || 0;
      const hardSolved = acStats.find((s: any) => s.difficulty === 'Hard')?.count || 0;

      const data = {
        student_id: user.id,
        platform,
        username: lcUser.username,
        external_user_id: lcUser.username,
        profile_url: `https://leetcode.com/u/${lcUser.username}/`,
        rating: null,
        max_rating: null,
        rank: lcUser.profile?.ranking ? `#${lcUser.profile.ranking}` : null,
        problems_solved: totalSolved,
        easy_solved: easySolved,
        medium_solved: mediumSolved,
        hard_solved: hardSolved,
        is_public: Boolean(isPublic),
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('student_external_accounts')
        .upsert(data, { onConflict: 'student_id,platform' });

      return error
        ? NextResponse.json({ error: error.message }, { status: 400 })
        : NextResponse.json({ data });
    }

    if (platform === 'CODECHEF') {
      const ccProfile = await fetchCodeChefUserProfile(username);

      const data = {
        student_id: user.id,
        platform: 'CODECHEF',
        username: ccProfile.handle,
        external_user_id: ccProfile.handle,
        profile_url: ccProfile.profileUrl,
        rating: ccProfile.rating,
        max_rating: ccProfile.maxRating,
        rank: ccProfile.starsLabel,
        problems_solved: ccProfile.totalSolved,
        easy_solved: ccProfile.easySolved,
        medium_solved: ccProfile.mediumSolved,
        hard_solved: ccProfile.hardSolved,
        is_public: Boolean(isPublic),
        last_synced_at: new Date().toISOString(),
        metadata: {
          stars: ccProfile.stars,
          stars_label: ccProfile.starsLabel,
          global_rank: ccProfile.globalRank,
          country_rank: ccProfile.countryRank,
        },
      };

      const { error } = await supabase
        .from('student_external_accounts')
        .upsert(data, { onConflict: 'student_id,platform' });

      return error
        ? NextResponse.json({ error: error.message }, { status: 400 })
        : NextResponse.json({ data });
    }

    return NextResponse.json({ error: 'Unsupported platform.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not verify profile.' },
      { status: 400 }
    );
  }
}
