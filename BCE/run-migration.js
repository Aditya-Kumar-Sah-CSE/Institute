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
    const files = fs.readdirSync('./supabase/migrations')
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
      try {
        await sql.unsafe(sqlContent);
      } catch (err) {
        console.error(`Failed on ${file}:`, err.message);
        // Continue applying others (idempotent design assumed)
      }
    }
    console.log("All migrations finished!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
