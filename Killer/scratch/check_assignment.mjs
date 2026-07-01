import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nhkszidluzphwyixkktg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U'
);

async function check() {
  const { data, error } = await supabase.from('assignments').select('title, type, requires_github, requires_deploy');
  if (error) console.error(error);
  else console.log(data);
}

check();
