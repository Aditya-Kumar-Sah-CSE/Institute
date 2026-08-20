async function test() {
  const handle = 'killer_adi_28';
  const url = `https://www.codechef.com/users/${handle}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  
  const ratingSectionIdx = html.indexOf('rating-header');
  if (ratingSectionIdx !== -1) {
    console.log('--- RATING HEADER ---');
    console.log(html.substring(ratingSectionIdx - 100, ratingSectionIdx + 800));
  } else {
    console.log('rating-header not found. Searching for rating-data or rating-container:');
    const idx2 = html.indexOf('rating-container');
    if (idx2 !== -1) {
      console.log(html.substring(idx2 - 100, idx2 + 800));
    } else {
      const idx3 = html.indexOf('rating-star');
      if (idx3 !== -1) {
        console.log(html.substring(idx3 - 100, idx3 + 800));
      }
    }
  }
}

test();
