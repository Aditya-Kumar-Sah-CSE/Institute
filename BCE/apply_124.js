const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const dbUrl = env.POSTGRES_URL || env.DATABASE_URL || env.SUPABASE_DB_URL || env.DIRECT_URL;
if (!dbUrl) {
  console.error("Error: No connection string found in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function run() {
  const file = '124_code_arena_student_workspace_files.sql';
  console.log(`Applying migration: ${file}...`);
  const sqlContent = fs.readFileSync(`./supabase/migrations/${file}`, 'utf8');
  try {
    await sql.unsafe(sqlContent);
    await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log("Migration 124 applied successfully!");
  } catch (err) {
    console.error(`Failed:`, err.message);
  } finally {
    await sql.end();
  }
}
run();
