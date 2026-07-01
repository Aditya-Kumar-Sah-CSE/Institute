const fs = require('fs');
const { Client } = require('pg');


async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/021_lesson_pdf_notes.sql', 'utf8');
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
