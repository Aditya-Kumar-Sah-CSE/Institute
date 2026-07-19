const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
  const connectionString = 'postgresql://postgres:4.H2ygYDM&8S6i!@db.myubfyfnovlvlzvglryv.supabase.co:5432/postgres';
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    
    // Read the SQL file
    const sql = fs.readFileSync('stories_schema.sql', 'utf8');
    
    // Execute all statements
    await client.query(sql);
    
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
