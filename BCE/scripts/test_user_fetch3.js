async function test() {
  const handle = 'killer_adi_28';
  const url = `https://www.codechef.com/users/${handle}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    }
  });
  const html = await res.text();
  
  const idx = html.indexOf('rating-header');
  if (idx !== -1) {
    const snippet = html.substring(idx, idx + 1200);
    console.log('--- RATING HEADER FULL SNIPPET ---');
    console.log(snippet);
  }
}

test();
