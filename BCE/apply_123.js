const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const file = '123_smart_learn_multiplayer_games.sql';
  console.log(`Applying migration: ${file}...`);
  const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
  try {
    await sql.unsafe(sqlContent);
    console.log("Migration 123 applied successfully!");
  } catch (err) {
    console.error(`Failed:`, err.message);
  } finally {
    await sql.end();
  }
}
run();
