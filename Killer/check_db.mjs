import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'iambestadi@gmail.com')
    .single();

  console.log('Profile:', profile);
  
  const { data: apps, error: err2 } = await supabase
    .from('instructor_applications')
    .select('*')
    .eq('user_id', profile?.id);

  console.log('Applications:', apps);
}

main();
