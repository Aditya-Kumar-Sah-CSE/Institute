const fs = require('fs');
const postgres = require('postgres');

async function migrate() {
  const sql = postgres("postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres", { ssl: 'require' });

  try {
    console.log("Applying 077...");
    const p77 = fs.readFileSync('supabase/migrations/077_fix_rls_for_roles.sql', 'utf8');
    await sql.unsafe(p77);
    console.log("077 applied");

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

migrate();
