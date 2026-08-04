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
  const { data: courses } = await supabase
    .from('courses')
    .update({ institution_id: null })
    .in('title', ['DAA', 'DSA', 'COA', 'Maths II', 'COA ', 'Computer Network']);
  console.log("Disconnected test courses from BCE.");
  
  const { data: profs } = await supabase
    .from('profiles')
    .update({ institution_id: null })
    .in('name', ['test', 'Ramesh ', 'Rahul']);
  console.log("Disconnected test profiles from BCE.");
}

check().catch(console.error);
