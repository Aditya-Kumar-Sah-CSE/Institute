const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const migrations = [
    '109_super_admin_cms.sql',
    '110_tenant_landing_content.sql',
  ];

  for (const file of migrations) {
    console.log(`Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
    try {
      await sql.unsafe(sqlContent);
      console.log(`Migration ${file} applied successfully!`);
    } catch (err) {
      console.error(`Failed ${file}:`, err.message);
    }
  }
  await sql.end();
}
run();
