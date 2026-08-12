import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;

async function apply086() {
  if (!dbUrl) {
    console.error('No Postgres connection string found.');
    return;
  }

  const sql = postgres(dbUrl, { ssl: 'require' });
  try {
    console.log('Applying 086_code_arena_lobby_status.sql...');
    const sql086 = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/086_code_arena_lobby_status.sql'), 'utf8');
    await sql.unsafe(sql086);
    await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log('✓ Migration 086 applied successfully.');
  } catch (err: any) {
    console.error('Migration 086 error:', err);
  } finally {
    await sql.end();
  }
}

apply086();
