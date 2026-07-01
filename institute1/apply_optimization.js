const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres'
});

async function applyMigration() {
  await client.connect();
  const sql = fs.readFileSync('./supabase/migrations/040_optimize_database.sql', 'utf8');
  try {
    await client.query(sql);
    console.log("Optimization Migration applied successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

applyMigration();
