const postgres = require('postgres');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});
const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function fix() {
  try {
    const data = await sql`SELECT * FROM subscriptions limit 5`;
    console.log("Subscriptions:", data);
    
    // Also log the foreign keys for subscriptions
    const fks = await sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'subscriptions' AND tc.constraint_type = 'FOREIGN KEY';
    `;
    console.log("Foreign Keys:", fks);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
