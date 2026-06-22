import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:isckSmkT1KRrwvc1@db.nhkszidluzphwyixkktg.supabase.co:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Fixing CHECK constraint...');
    await client.query(`ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`);
    await client.query(`ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'instructor'));`);
    console.log('Constraint fixed.');

    console.log('Updating role of approved instructors...');
    // Only update those who have an approved application and their current role is student
    const result = await client.query(`
      UPDATE profiles
      SET role = 'instructor'
      WHERE id IN (
        SELECT user_id FROM instructor_applications WHERE status = 'approved'
      ) AND role = 'student';
    `);
    console.log(`Updated ${result.rowCount} profiles.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
