import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
const keyMatch = envFile.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

async function testSignupCurl() {
  const timestamp = Date.now();
  const testEmail = `testcurl${timestamp}@example.com`;
  
  const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      data: { name: 'Test User', institute_id: 'TEST101' }
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response body:', text);
}

testSignupCurl();
