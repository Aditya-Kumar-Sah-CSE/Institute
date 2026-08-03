const { Client } = require('pg');
const fs = require('fs');

const dbUrl = fs.readFileSync('.env.local', 'utf8').split('\n')
  .find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();

async function migrate() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  console.log('Adding domain management columns...');
  
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='domain_status') THEN
        ALTER TABLE institutions ADD COLUMN domain_status text DEFAULT 'pending';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='ssl_status') THEN
        ALTER TABLE institutions ADD COLUMN ssl_status text DEFAULT 'pending';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='verified_at') THEN
        ALTER TABLE institutions ADD COLUMN verified_at timestamptz;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='domain_history') THEN
        ALTER TABLE institutions ADD COLUMN domain_history jsonb DEFAULT '[]'::jsonb;
      END IF;
    END $$;
  `);

  console.log('Domain management columns added successfully!');
  await client.end();
}

migrate().catch(console.error);
