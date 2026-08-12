const { execSync } = require('child_process');
const fs = require('fs');

async function test2250A() {
  const url = 'https://codeforces.com/problemset/problem/2250/A';
  console.log('Testing curl to:', url);
  try {
    const cmd = `curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" "${url}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log('Curl output length:', out.length);
    console.log('Contains problem-statement:', out.includes('problem-statement'));
    if (out.includes('problem-statement')) {
      fs.writeFileSync('sample_cf_2250A.html', out);
      console.log('Saved 2250A HTML!');
    } else {
      console.log('First 500 chars of output:', out.slice(0, 500));
    }
  } catch (e) {
    console.error('Curl failed:', e.message);
  }
}

test2250A();
