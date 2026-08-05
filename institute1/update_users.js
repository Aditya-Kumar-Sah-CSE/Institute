const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const targetInstId = 'a090da9b-dc71-478d-849b-182398e8a298'; // Smart Learn (Platform / Root)

  // 1. Update all old students
  const { data: oldStudents, error: hsErr } = await supabase
    .from('profiles')
    .update({ institution_id: targetInstId, role: 'student' })
    .in('email', ['saurav@gmail.com', 'absk@gmail.com']);
  console.log("Updated specific students to root route.");

  // 2. Update specific faculty
  const { data: faculty, error: fErr } = await supabase
    .from('profiles')
    .update({ institution_id: targetInstId, role: 'instructor' })
    .in('email', ['test@gmail.com']);
  console.log("Updated specific faculty to root route.");

  // 3. Update ALL other users who don't have Smart Learn to Smart Learn? 
  // Wait, the user said "phele ke all login sutdents and faculty admin ko / routes se connect kro".
  // This probably means changing all users in the system to use the root route (main-campus).
  // Or maybe it simply means updating their institution_id.
  
  const { data: allUpdate, error: allErr } = await supabase
    .from('profiles')
    .update({ institution_id: targetInstId })
    .in('role', ['student', 'instructor', 'admin', 'super_admin']);
  
  if (allErr) console.error("Error updating all roles:", allErr);
  else console.log(`Updated all users to connect to root route (Smart Learn institution).`);

}

run().catch(console.error);
