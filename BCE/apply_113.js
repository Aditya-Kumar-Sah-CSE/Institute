const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const file = '113_monthly_coding_ranking.sql';
  console.log(`Applying migration: ${file}...`);
  const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
  try {
    await sql.unsafe(sqlContent);
    console.log("Migration 113 applied successfully!");
    await sql.unsafe("NOTIFY pgrst, 'reload schema'");
    console.log("Schema cache reloaded!");
  } catch (err) {
    console.error(`Failed:`, err.message);
  } finally {
    await sql.end();
  }
}
run();
