const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres'
});

async function extractSchema() {
  await client.connect();
  const schema = { tables: {}, indexes: [], foreign_keys: [], functions: [], policies: [] };

  try {
    // Get Tables & Columns
    const tablesRes = await client.query(`
      SELECT table_name, column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    tablesRes.rows.forEach(r => {
      if (!schema.tables[r.table_name]) schema.tables[r.table_name] = [];
      schema.tables[r.table_name].push(r);
    });

    // Get Indexes
    const idxRes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);
    schema.indexes = idxRes.rows;

    // Get Foreign Keys
    const fkRes = await client.query(`
      SELECT
          tc.table_name, kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule, rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `);
    schema.foreign_keys = fkRes.rows;

    // Get Policies
    const polRes = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
    `);
    schema.policies = polRes.rows;

    fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
    console.log("Schema dumped to schema_dump.json");
  } catch (e) {
    console.error("Failed:", e);
  } finally {
    await client.end();
  }
}

extractSchema();
