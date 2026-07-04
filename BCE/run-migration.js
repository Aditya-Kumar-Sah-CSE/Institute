const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function runMigration() {
  try {
    const migrationsDir = './supabase/migrations';
    const files = fs.readdirSync(migrationsDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort(); // Sort alphabetically (001, 002, etc.)

    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await sql.unsafe(migration);
        console.log(`✅ Successfully applied ${file}`);
      } catch (err) {
        console.error(`❌ Failed applying ${file}:`, err.message);
        // Depending on your need, you can either throw err to stop or continue.
        // throw err; 
      }
    }
    
    console.log("All migrations finished!");
  } catch (error) {
    console.error("Migration process failed:", error);
  } finally {
    await sql.end();
  }
}

runMigration();
