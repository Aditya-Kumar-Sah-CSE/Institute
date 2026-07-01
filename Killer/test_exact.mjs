import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userId = '2806138d-7118-460a-94f1-33ab885ad7d7'; // iambestadi@gmail.com
  
  let query = adminSupabase
    .from('submissions')
    .select('*, profiles(name, email), assignments(title, type, xp_reward)', { count: 'exact' })
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false });

  const { data: myCourses } = await adminSupabase.from('courses').select('id').eq('created_by', userId);
  const courseIds = myCourses?.map(c => c.id) || [];
  let assignmentIds = [];

  if (courseIds.length > 0) {
    const { data: myLessons } = await adminSupabase.from('lessons').select('id').in('course_id', courseIds);
    const lessonIds = myLessons?.map(l => l.id) || [];

    if (lessonIds.length > 0) {
      const { data: myAssignments } = await adminSupabase.from('assignments').select('id').in('lesson_id', lessonIds);
      assignmentIds = myAssignments?.map(a => a.id) || [];
    }
  }

  if (assignmentIds.length > 0) {
    query = query.in('assignment_id', assignmentIds);
  } else {
    query = query.in('assignment_id', ['00000000-0000-0000-0000-000000000000']);
  }

  const { data, count, error } = await query;
  console.log('Returned submissions count:', data?.length);
  console.log('Submissions:', data?.map(d => ({ id: d.id, student: d.profiles?.name, assignment: d.assignments?.title })));
}

check().catch(console.error);
