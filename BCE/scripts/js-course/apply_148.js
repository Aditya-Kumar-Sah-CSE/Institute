const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const env = {};
for (const line of fs.readFileSync(path.join('d:', 'smart learn', 'BCE', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { max: 1 });
(async () => {
  await sql.unsafe(fs.readFileSync(path.join('d:', 'smart learn', 'BCE', 'supabase', 'migrations', '148_lesson_interactive_steps.sql'), 'utf8'));
  const cols = await sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'interactive_steps'
  `;
  console.log('LESSONS_INTERACTIVE_COL:', JSON.stringify(cols));
  await sql.end();
})();

