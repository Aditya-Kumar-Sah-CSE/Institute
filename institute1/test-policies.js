const { createClient } = require('@supabase/supabase-js');
const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function checkPolicies() {
  try {
    const policies = await sql`
      SELECT polrelid::regclass::text AS tablename, polname, polcmd, polroles, polqual
      FROM pg_policy
      WHERE polrelid::regclass::text = 'institutions'
    `;
    console.log("Policies on 'institutions':", JSON.stringify(policies, null, 2));
    
    // Also check subscriptions
    const subPolicies = await sql`
      SELECT polrelid::regclass::text AS tablename, polname, polcmd, polroles, polqual
      FROM pg_policy
      WHERE polrelid::regclass::text = 'subscriptions'
    `;
    console.log("Policies on 'subscriptions':", JSON.stringify(subPolicies, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkPolicies();
