async function test() {
  const handle = 'killer_adi_28';
  const url = `https://www.codechef.com/users/${handle}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const htmlContent = await res.text();
  
  const ratingMatch = htmlContent.match(/rating-number[^>]*>\s*(\d+)/i) || htmlContent.match(/class="rating-number"[^>]*>\s*(\d+)/i);
  const highestMatch = htmlContent.match(/Highest Rating\s*(\d+)/i) || htmlContent.match(/\(Highest Rating\s*(\d+)\)/i);
  const globalRankMatch = htmlContent.match(/Global Rank:?[\s\S]*?<strong>\s*(\d+)\s*<\/strong>/i) || htmlContent.match(/global-rank[^>]*>\s*(\d+)/i);
  const countryRankMatch = htmlContent.match(/Country Rank:?[\s\S]*?<strong>\s*(\d+)\s*<\/strong>/i) || htmlContent.match(/country-rank[^>]*>\s*(\d+)/i);
  const solvedMatch = htmlContent.match(/Total Problems Solved:\s*(\d+)/i) || htmlContent.match(/Fully Solved\s*\(\s*(\d+)\s*\)/i);

  const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;
  const maxRating = highestMatch ? parseInt(highestMatch[1], 10) : rating;
  const globalRank = globalRankMatch ? parseInt(globalRankMatch[1], 10) : null;
  const countryRank = countryRankMatch ? parseInt(countryRankMatch[1], 10) : null;
  const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

  function getStarsFromRating(r) {
    if (!r || r < 1400) return { stars: 1, starsLabel: '1★ (Div 4)' };
    if (r < 1600) return { stars: 2, starsLabel: '2★ (Div 3)' };
    if (r < 1800) return { stars: 3, starsLabel: '3★ (Div 3)' };
    if (r < 2000) return { stars: 4, starsLabel: '4★ (Div 2)' };
    if (r < 2200) return { stars: 5, starsLabel: '5★ (Div 2)' };
    if (r < 2500) return { stars: 6, starsLabel: '6★ (Div 1)' };
    return { stars: 7, starsLabel: '7★ (Div 1)' };
  }

  const starObj = getStarsFromRating(rating);

  console.log('EXTRACTED DATA:', {
    handle,
    rating,
    maxRating,
    stars: starObj.stars,
    starsLabel: starObj.starsLabel,
    globalRank,
    countryRank,
    totalSolved,
  });
}

test();
