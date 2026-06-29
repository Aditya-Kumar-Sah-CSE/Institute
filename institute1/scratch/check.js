import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: enrollments } = await supabase.from('enrollments').select('status');
  console.log('Enrollments status count:');
  const counts = {};
  if (enrollments) {
    for (const e of enrollments) {
      counts[e.status] = (counts[e.status] || 0) + 1;
    }
  }
  console.log(counts);
  
  const { data: profiles } = await supabase.from('profiles').select('id, name, total_active_days, streak_days');
  console.log('Profiles:');
  console.log(profiles);
}

check();
