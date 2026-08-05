const postgres = require('postgres');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});
const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fixDB() {
  try {
    // Drop bad constraint pointing to profiles
    await sql`ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_institution_id_fkey`;
    console.log("Dropped bad constraint.");
    
    // Add correct constraint pointing to institutions
    await sql`ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE`;
    console.log("Added corrected constraint pointing to institutions(id).");
    
    // Run the fix script
    const institutions = await sql`SELECT id, name FROM institutions`;
    console.log(`Found ${institutions.length} institutions.`);
    
    let plans = await sql`SELECT id, name FROM pricing_plans WHERE name ILIKE '%free%' AND is_deleted = false LIMIT 1`;
    if (plans.length === 0) {
      plans = await sql`SELECT id, name FROM pricing_plans WHERE is_deleted = false LIMIT 1`;
    }
    
    if (plans.length > 0) {
       for (const inst of institutions) {
          const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await sql`INSERT INTO subscriptions (institution_id, plan_id, status, renews_at, total_paid) VALUES (${inst.id}, ${plans[0].id}, 'trial', ${renewsAt}, 0)`;
          console.log(`Fixed institution: ${inst.name}`);
       }
       console.log('All retroactive fixes applied!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fixDB();
