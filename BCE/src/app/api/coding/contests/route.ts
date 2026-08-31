import { NextResponse } from 'next/server';

export interface UnifiedContest {
  id: string;
  platform: 'CODECHEF' | 'CODEFORCES' | 'LEETCODE' | 'GEEKSFORGEEKS';
  title: string;
  startTime: number; // ms
  endTime: number; // ms
  duration: number; // seconds
  registerUrl: string;
  status: 'UPCOMING' | 'LIVE' | 'STARTING_SOON';
}

// In-memory cache with 5-minute TTL
let cachedContests: UnifiedContest[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();
  if (cachedContests.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return NextResponse.json({ contests: cachedContests, cached: true });
  }

  const contests: UnifiedContest[] = [];

  // 1. Codeforces Contests
  try {
    const cfRes = await fetch('https://codeforces.com/api/contest.list', { next: { revalidate: 300 } });
    if (cfRes.ok) {
      const cfJson = await cfRes.json();
      if (cfJson.status === 'OK' && Array.isArray(cfJson.result)) {
        const cfContests = cfJson.result.filter((c: any) => c.phase === 'BEFORE' || c.phase === 'CODING');
        for (const c of cfContests) {
          const startTime = c.startTimeSeconds * 1000;
          const duration = c.durationSeconds || 7200;
          const endTime = startTime + duration * 1000;
          
          let status: 'UPCOMING' | 'LIVE' | 'STARTING_SOON' = 'UPCOMING';
          if (c.phase === 'CODING' || (now >= startTime && now <= endTime)) {
            status = 'LIVE';
          } else if (startTime - now <= 3 * 3600 * 1000 && startTime > now) {
            status = 'STARTING_SOON';
          }

          contests.push({
            id: `cf-${c.id}`,
            platform: 'CODEFORCES',
            title: c.name,
            startTime,
            endTime,
            duration,
            registerUrl: `https://codeforces.com/contest/${c.id}`,
            status,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[CONTESTS API] Codeforces fetch error:', e);
  }

  // 2. CodeChef Contests
  try {
    const ccRes = await fetch('https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 300 },
    });
    if (ccRes.ok) {
      const ccJson = await ccRes.json();
      
      // Present (Live) Contests
      if (Array.isArray(ccJson.present_contests)) {
        for (const c of ccJson.present_contests) {
          const startTime = new Date(c.contest_start_date_iso || c.contest_start_date).getTime() || now;
          const duration = (parseInt(c.contest_duration, 10) || 120) * 60;
          const endTime = startTime + duration * 1000;

          contests.push({
            id: `cc-${c.contest_code}`,
            platform: 'CODECHEF',
            title: c.contest_name || `CodeChef ${c.contest_code}`,
            startTime,
            endTime,
            duration,
            registerUrl: `https://www.codechef.com/${c.contest_code}`,
            status: 'LIVE',
          });
        }
      }

      // Future (Upcoming) Contests
      if (Array.isArray(ccJson.future_contests)) {
        for (const c of ccJson.future_contests) {
          const startTime = new Date(c.contest_start_date_iso || c.contest_start_date).getTime();
          if (!startTime || isNaN(startTime)) continue;
          
          const duration = (parseInt(c.contest_duration, 10) || 120) * 60;
          const endTime = startTime + duration * 1000;

          let status: 'UPCOMING' | 'LIVE' | 'STARTING_SOON' = 'UPCOMING';
          if (startTime - now <= 3 * 3600 * 1000 && startTime > now) {
            status = 'STARTING_SOON';
          }

          contests.push({
            id: `cc-${c.contest_code}`,
            platform: 'CODECHEF',
            title: c.contest_name || `CodeChef ${c.contest_code}`,
            startTime,
            endTime,
            duration,
            registerUrl: `https://www.codechef.com/${c.contest_code}`,
            status,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[CONTESTS API] CodeChef fetch error:', e);
  }

  // 3. LeetCode Contests
  try {
    const lcRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        query: `
          query {
            topTwoContests {
              title
              titleSlug
              startTime
              duration
            }
          }
        `,
      }),
      next: { revalidate: 300 },
    });

    if (lcRes.ok) {
      const lcJson = await lcRes.json();
      const topContests = lcJson.data?.topTwoContests || [];
      for (const c of topContests) {
        const startTime = Number(c.startTime) * 1000;
        const duration = Number(c.duration) || 5400;
        const endTime = startTime + duration * 1000;

        let status: 'UPCOMING' | 'LIVE' | 'STARTING_SOON' = 'UPCOMING';
        if (now >= startTime && now <= endTime) {
          status = 'LIVE';
        } else if (startTime - now <= 3 * 3600 * 1000 && startTime > now) {
          status = 'STARTING_SOON';
        }

        contests.push({
          id: `lc-${c.titleSlug}`,
          platform: 'LEETCODE',
          title: c.title,
          startTime,
          endTime,
          duration,
          registerUrl: `https://leetcode.com/contest/${c.titleSlug}`,
          status,
        });
      }
    }
  } catch (e) {
    console.warn('[CONTESTS API] LeetCode fetch error:', e);
  }

  // 4. GeeksforGeeks Contests
  try {
    const gfgRes = await fetch('https://practiceapi.geeksforgeeks.org/api/vr/events/?type=contest&page_number=1&sub_type=all', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 300 },
    });
    if (gfgRes.ok) {
      const gfgJson = await gfgRes.json();
      const eventsList = gfgJson.results || gfgJson.data || gfgJson.events || [];
      if (Array.isArray(eventsList)) {
        for (const ev of eventsList) {
          const startTimeStr = ev.start_time || ev.start_date || ev.startTime;
          const endTimeStr = ev.end_time || ev.end_date || ev.endTime;
          if (!startTimeStr) continue;

          const startTime = new Date(startTimeStr).getTime();
          if (isNaN(startTime)) continue;

          const endTime = endTimeStr ? new Date(endTimeStr).getTime() : startTime + 2 * 3600 * 1000;
          const duration = Math.max(3600, Math.floor((endTime - startTime) / 1000));

          let status: 'UPCOMING' | 'LIVE' | 'STARTING_SOON' = 'UPCOMING';
          if (now >= startTime && now <= endTime) {
            status = 'LIVE';
          } else if (startTime - now <= 3 * 3600 * 1000 && startTime > now) {
            status = 'STARTING_SOON';
          }

          const slug = ev.slug || ev.id || String(ev.title || 'contest').toLowerCase().replace(/\s+/g, '-');
          contests.push({
            id: `gfg-${slug}`,
            platform: 'GEEKSFORGEEKS',
            title: ev.title || ev.name || `GeeksforGeeks Contest ${slug}`,
            startTime,
            endTime,
            duration,
            registerUrl: ev.url || `https://practice.geeksforgeeks.org/contest/${slug}`,
            status,
          });
        }
      }
    }
  } catch (e) {
    console.warn('[CONTESTS API] GeeksforGeeks fetch error:', e);
  }

  // Sort by startTime ascending
  contests.sort((a, b) => a.startTime - b.startTime);

  if (contests.length > 0) {
    cachedContests = contests;
    cacheTimestamp = now;
  }

  return NextResponse.json({ contests: cachedContests.length > 0 ? cachedContests : contests });
}
