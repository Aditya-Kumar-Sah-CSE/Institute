const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cmvvlshtrouyqxdrvlth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdnZsc2h0cm91eXF4ZHJ2bHRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzMzc4NiwiZXhwIjoyMDk3NTA5Nzg2fQ.7FIwiu7BOD47gZ0N4XcUrwU0-b3Tulzn3crhxPNpOHc' // service role key
);

async function check() {
  const { data, error } = await supabase.from('instructor_applications').select('*, profiles(name, email)');
  console.log('Applications:', JSON.stringify(data, null, 2));
  if (error) console.error(error);
}

check();
