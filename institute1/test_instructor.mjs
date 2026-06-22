import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Profiles ---');
  const { data: profiles } = await supabase.from('profiles').select('id, email, role, status');
  console.log(profiles);

  console.log('--- Courses ---');
  const { data: courses } = await supabase.from('courses').select('id, title, created_by');
  console.log(courses);

  console.log('--- Lessons ---');
  const { data: lessons } = await supabase.from('lessons').select('id, course_id, title');
  console.log(lessons);

  console.log('--- Assignments ---');
  const { data: assignments } = await supabase.from('assignments').select('id, lesson_id, title');
  console.log(assignments);

  console.log('--- Submissions ---');
  const { data: submissions } = await supabase.from('submissions').select('id, user_id, assignment_id, status');
  console.log(submissions);
}

check().catch(console.error);
