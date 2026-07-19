const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fixRLS() {
  try {
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Members can view participants" ON chat_members;
      CREATE POLICY "Members can view participants" ON chat_members
        FOR SELECT USING (auth.role() = 'authenticated');
    `);
    console.log("RLS fixed successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
fixRLS();
