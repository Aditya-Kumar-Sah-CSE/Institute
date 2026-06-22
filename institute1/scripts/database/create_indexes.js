const postgres = require('postgres');

async function main() {
  const connectionString = 'postgresql://postgres:isckSmkT1KRrwvc1@db.nhkszidluzphwyixkktg.supabase.co:5432/postgres';
  const sql = postgres(connectionString);

  try {
    console.log('Creating performance indexes...');

    await sql`CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON public.assignments(lesson_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON public.xp_log(user_id);`;

    console.log('Successfully created all indexes!');
  } catch (err) {
    console.error('Error creating indexes:', err);
  } finally {
    await sql.end();
  }
}

main();
