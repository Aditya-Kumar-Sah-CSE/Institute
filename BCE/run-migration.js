const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function runMigration() {
  try {
    const migration = fs.readFileSync('./supabase/migrations/057_public_submissions.sql', 'utf8');
    await sql.unsafe(migration);
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
