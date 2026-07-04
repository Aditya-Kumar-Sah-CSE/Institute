const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fixBug() {
  try {
    console.log("Applying bonus_xp column fix...");
    await sql.unsafe(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS bonus_xp INTEGER DEFAULT 0;`);
    console.log("Fix applied. Now running run-migration.js...");
    
    // We will just let the user run migrations or check if they pass now
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

fixBug();
