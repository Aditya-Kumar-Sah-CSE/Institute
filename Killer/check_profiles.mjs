import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/^DATABASE_URL=(.*)$/m);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

const { Client } = pg;

async function checkAdmin() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT p.id, p.email, p.role, p.status, a.id as app_id
      FROM profiles p
      LEFT JOIN instructor_applications a ON a.user_id = p.id
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkAdmin();
