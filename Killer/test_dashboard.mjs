import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhkszidluzphwyixkktg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oa3N6aWRsdXpwaHd5aXhra3RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkzNDAzNSwiZXhwIjoyMDk3NTEwMDM1fQ.3gPVE6dHYfKwr4S_7icKO-Ay05LTWXwwmVmhWDJpb5U';
const supabase = createClient(supabaseUrl, supabaseKey); // Regular client
const adminSupabase = createClient(supabaseUrl, supabaseKey); // Same for test, since we have service role key, wait!

// If we use service role key for 'supabase', it acts as admin.
// But in the real app, 'supabase' uses anon key + user token.
// Let's use the actual query.

async function check() {
  const userId = '2806138d-7118-460a-94f1-33ab885ad7d7'; // iambestadi@gmail.com

  const { data: courses } = await adminSupabase
    .from('courses')
    .select('*, lessons(id)')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  const courseIds = courses?.map(c => c.id) || [];
  console.log('courseIds:', courseIds);

  let pendingReviewsCount = 0;

  if (courseIds.length > 0) {
    const { data: lessons } = await adminSupabase.from('lessons').select('id').in('course_id', courseIds);
    const lessonIds = lessons?.map(l => l.id) || [];
    console.log('lessonIds:', lessonIds);
    
    if (lessonIds.length > 0) {
      const { data: assignments } = await adminSupabase.from('assignments').select('id').in('lesson_id', lessonIds);
      const assignmentIds = assignments?.map(a => a.id) || [];
      console.log('assignmentIds:', assignmentIds);
      
      if (assignmentIds.length > 0) {
        const { count } = await adminSupabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds)
          .eq('status', 'pending');
        pendingReviewsCount = count || 0;
      }
    }
  }

  console.log('pendingReviewsCount:', pendingReviewsCount);
}

check().catch(console.error);
