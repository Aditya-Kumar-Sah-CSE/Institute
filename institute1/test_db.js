const { createClient } = require('@supabase/supabase-js');

// Must supply URL and key from env or mock if locally running
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'; // wait, local supabase isn't used
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// The user has .env.local in d:\Institute\institute1

const fs = require('fs');
const envFile = fs.readFileSync('d:/Institute/institute1/.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const { data: admins } = await supabase.from('profiles').select('id, email, role, institution_id').eq('role', 'admin');
  console.log("Admins:");
  console.dir(admins, { depth: null });
  
  const { data: insts } = await supabase.from('institutions').select('id, name, slug, logo');
  console.log("\nInstitutions:");
  console.dir(insts, { depth: null });
}

check().catch(console.error);
