const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fixInstitutionsRLS() {
  try {
    // Add public SELECT policy on institutions
    await sql`
      CREATE POLICY "Allow public read access to institutions"
      ON public.institutions
      FOR SELECT
      USING (true);
    `;
    console.log("Successfully attached public READ policy to the institutions table!");
  } catch (err) {
    if (err.message.includes('already exists')) {
       console.log("Policy already existed...");
    } else {
       console.error(err);
    }
  } finally {
    process.exit(0);
  }
}
fixInstitutionsRLS();
