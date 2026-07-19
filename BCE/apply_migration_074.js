const fs = require('fs');
const postgres = require('postgres');

const lines = fs.readFileSync('.env.local', 'utf-8').split('\n');
const dbLine = lines.find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbLine.replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');

const sql = postgres(dbUrl);

const migration = fs.readFileSync('./supabase/migrations/074_fix_story_media_bucket.sql', 'utf-8');

sql.unsafe(migration).then(() => {
  console.log('Migration applied OK');
  return sql.end();
}).then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message, err.detail || '');
  sql.end().then(() => process.exit(1));
});
