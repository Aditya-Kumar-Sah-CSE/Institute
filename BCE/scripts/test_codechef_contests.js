async function testCodeChefUser(handle) {
  try {
    console.log(`Fetching CodeChef profile for ${handle}...`);
    const res = await fetch(`https://codechef-api.vercel.app/handle/${handle}`);
    if (res.ok) {
      const data = await res.json();
      console.log('CodeChef Vercel API response:', data);
      return data;
    }
  } catch (e) {
    console.log('Vercel API failed:', e.message);
  }

  // Fallback: direct HTML fetch
  try {
    const htmlRes = await fetch(`https://www.codechef.com/users/${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await htmlRes.text();
    console.log('HTML response length:', html.length);
    const ratingMatch = html.match(/class="rating-number">(\d+)\??</i) || html.match(/rating-number">(\d+)/i);
    const starsMatch = html.match(/class="rating-star">([\s\S]*?)<\/div>/i) || html.match(/(\d+★|\d+&#9733;)/i);
    const highestRatingMatch = html.match(/Highest Rating\s*(\d+)/i) || html.match(/highest-rating[^>]*>\(Highest Rating\s*(\d+)\)/i);
    const globalRankMatch = html.match(/Global Rank:?\s*<[^>]+>\s*(\d+)/i) || html.match(/global-rank[^>]*>\s*(\d+)/i);
    
    console.log('HTML Scraped Stats:', {
      rating: ratingMatch ? ratingMatch[1] : null,
      stars: starsMatch ? starsMatch[1].trim() : null,
      highestRating: highestRatingMatch ? highestRatingMatch[1] : null,
      globalRank: globalRankMatch ? globalRankMatch[1] : null,
    });
  } catch (e) {
    console.log('HTML Fetch failed:', e.message);
  }
}

async function testContests() {
  console.log('\n--- Fetching Contests ---');
  try {
    const res = await fetch('https://codeforces.com/api/contest.list');
    const json = await res.json();
    if (json.status === 'OK') {
      const upcomingCF = json.result
        .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING')
        .slice(0, 5);
      console.log('Codeforces Contests:', upcomingCF.map(c => ({
        id: c.id,
        name: c.name,
        phase: c.phase,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        relativeTimeSeconds: c.relativeTimeSeconds
      })));
    }
  } catch (e) {
    console.log('CF contest fetch failed:', e.message);
  }

  try {
    const res = await fetch('https://kontests.net/api/v1/all');
    if (res.ok) {
      const all = await res.json();
      console.log('Kontests count:', all.length);
      console.log('Sample Kontests:', all.slice(0, 5));
    } else {
      console.log('Kontests API HTTP status:', res.status);
    }
  } catch (e) {
    console.log('Kontests API failed:', e.message);
  }
}

async function run() {
  await testCodeChefUser('tourist');
  await testContests();
}

run();
