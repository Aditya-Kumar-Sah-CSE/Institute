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
  console.log("Updating profiles_role_check constraint...");
  try {
    await sql.unsafe(`
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'instructor', 'developer', 'super_admin', 'superadmin'));
      NOTIFY pgrst, 'reload schema';
    `);
    console.log("SUCCESS: profiles_role_check constraint updated!");
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await sql.end();
  }
}
run();
