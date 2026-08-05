const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  // Update Saurav and Absk
  await supabase
    .from('profiles')
    .update({ institution_id: null, role: 'student' })
    .in('email', ['saurav@gmail.com', 'absk@gmail.com']);
  console.log("Updated specific students to root route.");

  // Update Test Faculty
  await supabase
    .from('profiles')
    .update({ institution_id: null, role: 'instructor' })
    .in('email', ['test@gmail.com']);
  console.log("Updated specific faculty to root route.");

  // Update Imbestadi
  const { data: imbestadi } = await supabase.from('profiles').select('*').eq('email', 'imbestadi@gmail.com').maybeSingle();
  if (imbestadi) {
     await supabase.from('profiles').update({ role: 'super_admin', institution_id: null }).eq('id', imbestadi.id);
     console.log("Updated imbestadi to super_admin");
  } else {
     console.log("imbestadi@gmail.com not found. They need to sign up first, or we can't update them here.");
  }

  // Update ALL other prior students, faculty, and admins to root
  const { data: allUpdate, error: allErr } = await supabase
    .from('profiles')
    .update({ institution_id: null })
    .in('role', ['student', 'instructor', 'admin', 'super_admin']);
  
  if (allErr) console.error("Error updating all roles:", allErr);
  else console.log(`Updated all older students, faculty, and admins to root route (institution_id = null).`);
}

run().catch(console.error);
