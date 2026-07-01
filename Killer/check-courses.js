const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  try {
    const res = await client.query('SELECT id, title, created_by, is_published FROM courses;');
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
