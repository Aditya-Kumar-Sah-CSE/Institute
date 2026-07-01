import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/^DATABASE_URL=(.*)$/m);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

const { Client } = pg;

async function applyIndexes() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log('Applying 023_additional_indexes.sql...');
    
    const sql = fs.readFileSync('supabase/migrations/023_additional_indexes.sql', 'utf8');
    await client.query(sql);
    
    console.log('Database indexes applied successfully.');
  } catch (err) {
    console.error('Error applying indexes:', err);
  } finally {
    await client.end();
  }
}

applyIndexes();
