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
    
    // Check if `primary_domain` already exists to prevent crash
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='institutions' and column_name='primary_domain';
    `);

    if (res.rowCount === 0) {
      console.log('Renaming domain to primary_domain...');
      await client.query('ALTER TABLE institutions RENAME COLUMN domain TO primary_domain;');
    } else {
      console.log('primary_domain already exists.');
    }

    const resCustom = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='institutions' and column_name='custom_domain';
    `);

    if (resCustom.rowCount === 0) {
      console.log('Adding custom_domain...');
      await client.query('ALTER TABLE institutions ADD COLUMN custom_domain text UNIQUE;');
    }

    // Add unique constraints if not exists
    console.log('Ensuring unique constraints...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'institutions_slug_key') THEN
          ALTER TABLE institutions ADD CONSTRAINT institutions_slug_key UNIQUE (slug);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'institutions_primary_domain_key') THEN
          ALTER TABLE institutions ADD CONSTRAINT institutions_primary_domain_key UNIQUE (primary_domain);
        END IF;
      END $$;
    `);

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

executeMigration();
