const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres'
});

async function applyMigration() {
  await client.connect();
  const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, institute_id, graduation_period)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email,
    new.raw_user_meta_data->>'institute_id',
    new.raw_user_meta_data->>'graduation_period'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
