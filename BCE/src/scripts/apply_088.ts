import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';

function loadEnv(file: string) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv('.env.local');
loadEnv('.env');

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;

async function apply088() {
  if (!dbUrl) {
    console.error('BLOCKED — DATABASE_URL/DIRECT_URL unavailable');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: 'require' });
  try {
    console.log('Applying 088_code_arena_dynamic_and_team_battles.sql...');
    const sql088 = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/088_code_arena_dynamic_and_team_battles.sql'),
      'utf8'
    );
    await sql.unsafe(sql088);
    await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log('✓ Migration 088 applied successfully.');
  } catch (err: any) {
    console.error('Migration 088 error:', err.message || err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

apply088();
