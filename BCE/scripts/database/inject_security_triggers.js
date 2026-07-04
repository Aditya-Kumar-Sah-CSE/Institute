const postgres = require('postgres');

async function main() {
  const connectionString = 'postgresql://postgres:isckSmkT1KRrwvc1@db.nhkszidluzphwyixkktg.supabase.co:5432/postgres';
  const sql = postgres(connectionString);

  try {
    console.log('Injecting Security Triggers...');

    await sql`
      CREATE OR REPLACE FUNCTION protect_profile_fields() RETURNS trigger AS $$
      BEGIN
        IF auth.role() = 'authenticated' THEN
          -- Revert any attempts by standard users to modify sensitive fields
          NEW.role = OLD.role;
          NEW.xp = OLD.xp;
          NEW.level = OLD.level;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await sql`DROP TRIGGER IF EXISTS on_profile_update ON profiles;`;
    
    await sql`
      CREATE TRIGGER on_profile_update
        BEFORE UPDATE ON profiles
        FOR EACH ROW EXECUTE PROCEDURE protect_profile_fields();
    `;

    await sql`
      CREATE OR REPLACE FUNCTION protect_submission_fields() RETURNS trigger AS $$
      BEGIN
        IF auth.role() = 'authenticated' THEN
          -- Revert any attempts by standard users to auto-approve themselves
          NEW.status = OLD.status;
          NEW.score = OLD.score;
          NEW.feedback = OLD.feedback;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await sql`DROP TRIGGER IF EXISTS on_submission_update ON submissions;`;
    
    await sql`
      CREATE TRIGGER on_submission_update
        BEFORE UPDATE ON submissions
        FOR EACH ROW EXECUTE PROCEDURE protect_submission_fields();
    `;

    console.log('Security triggers injected successfully!');
  } catch (err) {
    console.error('Error injecting triggers:', err);
  } finally {
    await sql.end();
  }
}

main();
