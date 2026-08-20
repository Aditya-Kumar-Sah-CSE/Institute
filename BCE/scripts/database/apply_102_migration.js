const postgres = require('postgres');

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:4.H2ygYDM%268S6i!@db.myubfyfnovlvlzvglryv.supabase.co:5432/postgres';
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

  try {
    console.log('Updating student_external_accounts_platform_check constraint...');

    await sql`
      ALTER TABLE public.student_external_accounts
        DROP CONSTRAINT IF EXISTS student_external_accounts_platform_check;
    `;

    await sql`
      ALTER TABLE public.student_external_accounts
        ADD CONSTRAINT student_external_accounts_platform_check
        CHECK (platform IN ('CODEFORCES', 'LEETCODE', 'CODECHEF'));
    `;

    console.log('SUCCESS: Successfully updated platform check constraint to include CODECHEF!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await sql.end();
  }
}

main();
