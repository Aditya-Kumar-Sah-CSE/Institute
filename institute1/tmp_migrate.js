const fs = require('fs');
const postgres = require('postgres');

async function migrate() {
  const sql = postgres("postgresql://postgres:A6jfXvAJNF2dPuyk@db.cmvvlshtrouyqxdrvlth.supabase.co:5432/postgres", { ssl: 'require' });

  try {
    console.log("Applying 078...");
    // Since I don't know the exact order/existence of others, just run 078 explicitly
    const p78 = fs.readFileSync('supabase/migrations/078_payment_billing_module.sql', 'utf8');
    await sql.unsafe(p78);
    console.log("078 applied");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

migrate();
