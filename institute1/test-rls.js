const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function checkRLS() {
  try {
    const rls = await sql`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname IN ('institutions', 'subscriptions')
    `;
    console.log("RLS Status:", JSON.stringify(rls, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkRLS();
