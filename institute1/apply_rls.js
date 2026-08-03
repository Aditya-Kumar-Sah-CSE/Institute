const { Client } = require('pg');
const fs = require('fs');

const dbUrl = fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('DATABASE_URL=')).split('=')[1].trim();
const superAdminEmail = fs.readFileSync('.env.local', 'utf8').split('\n').find(line => line.startsWith('SUPER_ADMIN_EMAIL=')).split('=')[1].trim();

async function executeRLS() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Find all tables with 'institution_id' column
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND column_name = 'institution_id';
    `);

    const tables = res.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tenant-owned tables:`, tables.join(', '));

    for (const table of tables) {
      console.log(`Applying RLS to ${table}...`);
      
      // Enable RLS
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

      // Drop existing policy if it exists to replace it
      await client.query(`DROP POLICY IF EXISTS "Tenant Isolation" ON "${table}";`);
      
      // Apply new Multi-Tenant Access Policy
      // Allows Super Admin full access, OR restricts regular users to their assigned institution_id
      const query = `
        CREATE POLICY "Tenant Isolation" ON "${table}" 
        AS PERMISSIVE FOR ALL 
        TO authenticated 
        USING (
          (auth.jwt()->'user_metadata'->>'email' = '${superAdminEmail}') OR
          (auth.jwt()->'user_metadata'->>'institution_id' = institution_id::text)
        )
        WITH CHECK (
          (auth.jwt()->'user_metadata'->>'email' = '${superAdminEmail}') OR
          (auth.jwt()->'user_metadata'->>'institution_id' = institution_id::text)
        );
      `;
      
      await client.query(query);
    }
    
    console.log('RLS applied successfully ensuring perfect tenant isolation!');
  } catch (err) {
    console.error('RLS application failed:', err);
  } finally {
    await client.end();
  }
}

executeRLS();
