const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const sql = `ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;`;
  try {
    await client.query(sql);
    console.log("Column is_deleted added successfully.");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await client.end();
  }
}

run();
