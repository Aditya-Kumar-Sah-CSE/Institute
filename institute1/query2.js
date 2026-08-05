const { createClient } = require('@supabase/supabase-js');
const url = 'https://cmvvlshtrouyqxdrvlth.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdnZsc2h0cm91eXF4ZHJ2bHRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzMzc4NiwiZXhwIjoyMDk3NTA5Nzg2fQ.7FIwiu7BOD47gZ0N4XcUrwU0-b3Tulzn3crhxPNpOHc';
const supabase = createClient(url, key);

async function main() {
  const { data: profile } = await supabase.from('profiles').select('id, email, institution_id, role').eq('email', 'adityakumarsah@gmail.com').maybeSingle();
  console.log('Profile:', profile);
  
  const { data: inst } = await supabase.from('institutions').select('id, name, slug').like('slug', '%bce-bhagalpur%').maybeSingle();
  console.log('Institution:', inst);
}
main();
