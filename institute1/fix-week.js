const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const sql = `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1;`;
  try {
    await client.query(sql);
    console.log("Column week_number added successfully.");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await client.end();
  }
}

run();
