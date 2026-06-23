const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Buckets:', data.map(b => b.name));
  }
}

check();
