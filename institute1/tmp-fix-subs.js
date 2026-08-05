const postgres = require('postgres');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});
const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fix() {
  try {
    // 1. Get institutions
    const institutions = await sql`SELECT id, name FROM institutions`;
    console.log(`Found ${institutions.length} institutions.`);

    // 2. Get subscriptions
    const subs = await sql`SELECT institution_id FROM subscriptions`;
    const subbedIds = new Set(subs.map(s => s.institution_id));

    // 3. Find missing
    const missing = institutions.filter(inst => !subbedIds.has(inst.id));
    console.log(`Found ${missing.length} missing subscriptions.`, missing.map(m => m.name));

    if (missing.length === 0) {
      console.log('Nothing to fix.');
      process.exit(0);
    }

    // 4. Find the free plan
    let plans = await sql`SELECT id, name FROM pricing_plans WHERE name ILIKE '%free%' AND is_deleted = false LIMIT 1`;
    if (plans.length === 0) {
      plans = await sql`SELECT id, name FROM pricing_plans WHERE is_deleted = false LIMIT 1`;
    }
    
    if (plans.length === 0) {
      console.log('No pricing plans found at all. Cannot associate a plan!');
      process.exit(1);
    }
    
    const planId = plans[0].id;
    console.log(`Using plan: ${plans[0].name} (${planId})`);

    // 5. Insert
    for (const inst of missing) {
       const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
       await sql`INSERT INTO subscriptions (institution_id, plan_id, status, renews_at, total_paid) VALUES (${inst.id}, ${planId}, 'trial', ${renewsAt}, 0)`;
       console.log(`Fixed institution: ${inst.name}`);
    }

    console.log('All fixed!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
