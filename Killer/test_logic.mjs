import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userId = '2806138d-7118-460a-94f1-33ab885ad7d7'; // iambestadi@gmail.com
  
  const { data: myCourses } = await adminSupabase.from('courses').select('id').eq('created_by', userId);
  const courseIds = myCourses?.map(c => c.id) || [];
  console.log('courseIds:', courseIds);

  let assignmentIds = [];
  if (courseIds.length > 0) {
    const { data: myLessons } = await adminSupabase.from('lessons').select('id').in('course_id', courseIds);
    const lessonIds = myLessons?.map(l => l.id) || [];
    console.log('lessonIds:', lessonIds);

    if (lessonIds.length > 0) {
      const { data: myAssignments } = await adminSupabase.from('assignments').select('id').in('lesson_id', lessonIds);
      assignmentIds = myAssignments?.map(a => a.id) || [];
      console.log('assignmentIds:', assignmentIds);
    }
  }

  let query = adminSupabase
    .from('submissions')
    .select('id, status, assignment_id', { count: 'exact' })
    .eq('status', 'pending');

  if (assignmentIds.length > 0) {
    query = query.in('assignment_id', assignmentIds);
  } else {
    query = query.in('assignment_id', ['00000000-0000-0000-0000-000000000000']);
  }

  const { data, error } = await query;
  console.log('submissions:', data, error);
}

check().catch(console.error);
