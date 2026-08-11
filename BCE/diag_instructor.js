const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const sql = postgres(env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const profiles = await sql`
    SELECT id, email, role, status, institution_id
    FROM profiles
    WHERE role IN ('instructor', 'admin', 'developer')
    ORDER BY role
  `;
  console.log('=== INSTRUCTOR/ADMIN ACCOUNTS ===');
  console.log(JSON.stringify(profiles, null, 2));

  const courses = await sql`
    SELECT id, title, created_by, is_deleted, is_published
    FROM courses
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('=== RECENT COURSES ===');
  console.log(JSON.stringify(courses, null, 2));

  await sql.end();
}

run().catch(err => { console.error(err); process.exit(1); });
