const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
     console.error("List users error:", error);
     return;
  }
  
  const im = users.users.find(u => u.email === 'imbestadi@gmail.com');
  if (im) {
      console.log("FOUND IMBESTADI:", im.id);
  } else {
      console.log("IMBESTADI NOT FOUND IN AUTH.");
  }
}

run().catch(console.error);
