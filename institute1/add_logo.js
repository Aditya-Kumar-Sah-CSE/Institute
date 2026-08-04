const { Client } = require('pg');
const fs = require('fs');
const dbUrl = fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('DATABASE_URL=')).split('=')[1].trim();

async function executeMigration() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Adding logo and image columns...');
    await client.query('ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo TEXT;');
    await client.query('ALTER TABLE institutions ADD COLUMN IF NOT EXISTS favicon TEXT;');
    await client.query('ALTER TABLE institutions ADD COLUMN IF NOT EXISTS cover_image TEXT;');
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

executeMigration();
