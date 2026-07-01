import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userId = '4ca12fb1-3a6e-44d1-9250-5d2a14226e0f'; // Admin: adityakumarsah8709@gmail.com
  
  let query = adminSupabase
    .from('submissions')
    .select('*, profiles(name, email), assignments(title, type, xp_reward)', { count: 'exact' })
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false });

  // Simulate if profile.role === 'admin' -> it SKIPS the instructor filter block
  // So query is just the base query.
  
  const { data, count, error } = await query;
  console.log('Admin Returned submissions count:', data?.length);
}

check().catch(console.error);
