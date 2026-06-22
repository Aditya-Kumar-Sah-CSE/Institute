import { createClient } from '@supabase/supabase-js';

// Need the service role key to update if RLS is preventing update, or just use service key
const supabase = createClient(
  'https://nhkszidluzphwyixkktg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U'
);

async function fixCourses() {
  // Find admin user
  const { data: admins, error: adminErr } = await supabase.from('profiles').select('id, name').eq('role', 'admin').limit(1);
  if (adminErr || !admins || admins.length === 0) {
    console.error('No admin found:', adminErr);
    return;
  }
  const adminId = admins[0].id;
  console.log('Found admin:', admins[0].name, adminId);

  // Update courses where created_by is null
  const { data, error } = await supabase.from('courses').update({ created_by: adminId }).is('created_by', null).select('title, created_by');
  
  if (error) console.error(error);
  else console.log('Updated courses:', data);
}

fixCourses();
