const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const sb = createClient(url, key);

async function inspectNulls() {
  const { data: nullProfs } = await sb.from('profiles').select('id, email, role, institution_id').is('institution_id', null);
  console.log('Profiles with NULL institution_id:', nullProfs?.length);
  console.log(nullProfs);

  const { data: nullCourses } = await sb.from('courses').select('id, title, institution_id').is('institution_id', null);
  console.log('Courses with NULL institution_id:', nullCourses?.length);
  console.log(nullCourses);

  const { data: nullSubs } = await sb.from('submissions').select('id, user_id, institution_id').is('institution_id', null);
  console.log('Submissions with NULL institution_id:', nullSubs?.length);
  console.log(nullSubs);

  const { data: nullApps } = await sb.from('instructor_applications').select('id, user_id, institution_id').is('institution_id', null);
  console.log('Instructor Applications with NULL institution_id:', nullApps?.length);
  console.log(nullApps);
}

inspectNulls();
