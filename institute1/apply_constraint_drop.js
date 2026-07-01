const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres'
});

async function applyMigration() {
  await client.connect();
  const sql = `
DO $$
DECLARE
    conname text;
BEGIN
    SELECT constraint_name INTO conname
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'courses' AND column_name = 'difficulty';

    IF conname IS NOT NULL THEN
        EXECUTE 'ALTER TABLE courses DROP CONSTRAINT ' || conname;
    END IF;
END $$;
  `;
  try {
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

applyMigration();
