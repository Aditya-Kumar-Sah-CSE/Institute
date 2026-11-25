const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const envPath = path.join('d:', 'smart learn', 'BCE', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const sql = postgres(env.DATABASE_URL, { max: 1 });

(async () => {
  const ddl = fs.readFileSync(
    path.join('d:', 'smart learn', 'BCE', 'supabase', 'migrations', '147_course_mcqs_setup.sql'),
    'utf8'
  );
  await sql.unsafe(ddl);
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_mcqs'
    ORDER BY ordinal_position
  `;
  console.log('COURSE_MCQS_COLS:', JSON.stringify(cols.map(c => c.column_name)));
  await sql.end();
})();

