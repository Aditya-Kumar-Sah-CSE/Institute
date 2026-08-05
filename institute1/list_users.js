const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const url = 'https://cmvvlshtrouyqxdrvlth.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdnZsc2h0cm91eXF4ZHJ2bHRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzMzc4NiwiZXhwIjoyMDk3NTA5Nzg2fQ.7FIwiu7BOD47gZ0N4XcUrwU0-b3Tulzn3crhxPNpOHc';
const supabase = createClient(url, key);

async function main() {
  const { data: allProfiles } = await supabase.from('profiles').select('id, email, role, name, institution_id');
  fs.writeFileSync('all_users.json', JSON.stringify(allProfiles, null, 2));
  console.log(`Total users: ${allProfiles?.length || 0}`);
  
  const keep = ['iambestadi@gmail.com', 'adityakumarsah@gmail.com'];
  const toDelete = allProfiles?.filter(p => !keep.includes(p.email)) || [];
  console.log(`Users to DELETE: ${toDelete.length}`);
  toDelete.forEach(u => console.log(`  - ${u.email} (${u.role}) ${u.name}`));
  
  const toKeep = allProfiles?.filter(p => keep.includes(p.email)) || [];
  console.log(`Users to KEEP: ${toKeep.length}`);
  toKeep.forEach(u => console.log(`  + ${u.email} (${u.role}) ${u.name}`));
}
main();
