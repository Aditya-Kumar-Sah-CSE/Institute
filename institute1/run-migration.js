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
    const migration60 = fs.readFileSync('./supabase/migrations/060_add_admission_filled.sql', 'utf8');
    await sql.unsafe(migration60);
    const migration61 = fs.readFileSync('./supabase/migrations/061_admission_pinned.sql', 'utf8');
    await sql.unsafe(migration61);
    console.log("Migrations 060 and 061 applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
