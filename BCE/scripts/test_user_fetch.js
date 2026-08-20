async function test() {
  const handle = 'killer_adi_28';
  const url = `https://www.codechef.com/users/${handle}`;
  console.log('Fetching', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  console.log('HTML Length:', html.length);
  
  const ratingMatch = html.match(/class="rating-number">(\d+)/i) || html.match(/rating-number">(\d+)/i);
  console.log('ratingMatch:', ratingMatch ? ratingMatch[1] : 'NONE');

  const starsMatch = html.match(/class="rating">(\d+★?)/i) || html.match(/(\d+)★/i) || html.match(/rating-star">[\s\S]*?(\d+)/i);
  console.log('starsMatch:', starsMatch);

  // Find rating-header or rating-number context
  const idx = html.indexOf('rating-number');
  if (idx !== -1) {
    console.log('rating-number context:', html.substring(idx - 100, idx + 400));
  }
  
  const idxStar = html.indexOf('rating-star');
  if (idxStar !== -1) {
    console.log('rating-star context:', html.substring(idxStar - 100, idxStar + 400));
  }

  const idxUser = html.indexOf('user-details-container');
  if (idxUser !== -1) {
    console.log('user-details-container context:', html.substring(idxUser, idxUser + 600));
  }
}

test();
