const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => envStr.split('\n').find(l => l.startsWith(key + '=')).split('=')[1].replace(/['"\r\n]/g, '').trim();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function run() {
  const { data: d1 } = await supabase.from('coding_sheet_problems').select('*').limit(1);
  console.log('coding_sheet_problems keys:', d1 && d1.length ? Object.keys(d1[0]) : 'empty');
  
  const { data: d2 } = await supabase.from('coding_problems').select('*').limit(1);
  console.log('coding_problems keys:', d2 && d2.length ? Object.keys(d2[0]) : 'empty');
}
run();
