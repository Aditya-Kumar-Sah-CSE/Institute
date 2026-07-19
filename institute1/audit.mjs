import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const sa = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anon = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function run() {
  console.log("--- 1. Testing inserting via service role ---");
  const uploadres = await fetch(`${url}/rest/v1/hall_of_fame?select=*&order=created_at.desc&limit=5`, {
      headers: { apikey: sa, Authorization: `Bearer ${sa}` }
  });
  const recent = await uploadres.json();
  console.log("RECENT DB ROWS:", JSON.stringify(recent, null, 2));

  console.log("\n--- 2. Testing fetching active stories via anon key (Testing RLS) ---");
  const now = new Date().toISOString();
  console.log("NOW:", now);
  const anonres = await fetch(`${url}/rest/v1/hall_of_fame?select=*&is_hidden=eq.false&expires_at=gt.${now}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` }
  });
  const data = await anonres.json();
  if (data.error || data.message) console.log("ANON ERR:", data);
  else console.log("ANON ACTIVE STORIES COUNT:", data.length);
  
  // also check if "is_hidden" is actually false or null
  const anonresall = await fetch(`${url}/rest/v1/hall_of_fame?select=*`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` }
  });
  console.log("ANON ALL STORIES COUNT (No filters):", (await anonresall.json()).length);
}

run();
