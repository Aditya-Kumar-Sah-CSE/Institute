const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  try {
    await sql.unsafe("NOTIFY pgrst, 'reload schema'");
    console.log("PostgREST schema cache reload triggered!");
  } catch (err) {
    console.error("Failed:", err.message);
  } finally {
    await sql.end();
  }
}
run();
