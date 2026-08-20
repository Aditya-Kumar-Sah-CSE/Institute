const { execSync } = require('child_process');

async function testCodeChefHTML() {
  try {
    const cmd = `curl.exe -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://www.codechef.com/users/tourist"`;
    const html = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    
    console.log('HTML size:', html.length);
    
    const ratingMatch = html.match(/class="rating-number">(\d+)/i) || html.match(/rating-number">(\d+)/i);
    const starMatch = html.match(/class="rating-star">([\s\S]*?)<\/div>/i) || html.match(/(\d+\s*★)/i);
    const highestMatch = html.match(/Highest Rating\s*(\d+)/i) || html.match(/\(Highest Rating\s*(\d+)\)/i);
    const globalRankMatch = html.match(/Global Rank:[\s\S]*?<strong>(\d+)<\/strong>/i) || html.match(/global-rank[^>]*>\s*(\d+)/i);
    const solvedMatch = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/Fully Solved\s*\((\d+)\)/i);

    console.log('Parsed CodeChef Profile:', {
      rating: ratingMatch ? parseInt(ratingMatch[1]) : null,
      stars: starMatch ? starMatch[1].trim() : null,
      highestRating: highestMatch ? parseInt(highestMatch[1]) : null,
      globalRank: globalRankMatch ? parseInt(globalRankMatch[1]) : null,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : null,
    });
  } catch (e) {
    console.error('CodeChef HTML error:', e.message);
  }
}

async function testCodeChefContestAPI() {
  try {
    const cmd = `curl.exe -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc"`;
    const raw = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    const json = JSON.parse(raw);
    console.log('\nCodeChef Contests API status:', json.status);
    if (json.future_contests) {
      console.log('Upcoming CodeChef Contests:', json.future_contests.slice(0, 3));
    }
    if (json.present_contests) {
      console.log('Live CodeChef Contests:', json.present_contests.slice(0, 3));
    }
  } catch (e) {
    console.error('CodeChef Contest API error:', e.message);
  }
}

async function testLeetCodeContests() {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
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
        `
      })
    });
    const json = await res.json();
    console.log('\nLeetCode Contests:', json.data);
  } catch (e) {
    console.error('LeetCode Contest error:', e.message);
  }
}

async function run() {
  await testCodeChefHTML();
  await testCodeChefContestAPI();
  await testLeetCodeContests();
}

run();
