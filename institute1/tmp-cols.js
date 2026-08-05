const postgres = require('postgres');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});
const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function getCols() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions'`;
  console.log(cols.map(c => c.column_name));
  process.exit(0);
}
getCols();
