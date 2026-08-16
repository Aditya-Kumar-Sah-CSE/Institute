import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { awardXP } from '@/features/auth/actions/auth';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SubmissionsListClient from '@/features/admin/components/SubmissionsListClient';

export const dynamic = 'force-dynamic';

export default async function InstructorSubmissionsPage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const supabase = await createClient();
  
  // Create a raw client without cookies to genuinely bypass RLS
  const serviceRoleClient = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();

  let query = serviceRoleClient
    .from('submissions')
    .select('*, profiles(name, email), assignments(title, type, xp_reward)', { count: 'exact' })
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .range(start, end);

  // Make these variables accessible in the JSX for debugging
  let courseIds: string[] = [];
  let lessonIds: string[] = [];
  let assignmentIds: string[] = [];

  if (user?.id) {
    const { data: myCourses } = await serviceRoleClient.from('courses').select('id').eq('created_by', user.id);
    courseIds = myCourses?.map(c => c.id) || [];

    if (courseIds.length > 0) {
      const { data: myLessons } = await serviceRoleClient.from('lessons').select('id').in('course_id', courseIds);
      lessonIds = myLessons?.map(l => l.id) || [];

      if (lessonIds.length > 0) {
        const { data: myAssignments } = await serviceRoleClient.from('assignments').select('id').in('lesson_id', lessonIds);
        assignmentIds = myAssignments?.map(a => a.id) || [];
      }
    }

    if (assignmentIds.length > 0) {
      query = query.in('assignment_id', assignmentIds);
    } else {
      query = query.in('assignment_id', ['00000000-0000-0000-0000-000000000000']);
    }
  } else {
    query = query.in('assignment_id', ['00000000-0000-0000-0000-000000000000']);
  }

  const { data: submissions, count } = await query;
  const totalPages = Math.ceil((count || 0) / limit);

  async function reviewSubmission(formData: FormData) {
    'use server';
    const userSupabase = await createClient();
    const { data: { user: currentUser } } = await userSupabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor' && profile.role !== 'developer')) {
      throw new Error('Unauthorized');
    }

    // Use raw client to bypass RLS for Instructor actions
    const sb = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const submissionId = formData.get('submissionId') as string;
    const action = formData.get('action') as 'approve' | 'reject';
    const feedback = formData.get('feedback') as string;

    const { data: sub } = await sb.from('submissions').select('*, assignments(xp_reward, title)').eq('id', submissionId).single();
    if (!sub) return;

    if (action === 'approve') {
      await awardXP(sub.user_id, sub.assignments.xp_reward, `Approved Assignment: ${sub.assignments.title}`, 'assignment', sub.assignments.id);
      
      // Update the submission status to approved (keeps DB history for community view)
      await sb.from('submissions').update({ status: 'approved', feedback }).eq('id', submissionId);

      const { checkBadges } = await import('@/features/gamification/actions/gamification');
      await checkBadges(sub.user_id);
    } else {
      await sb.from('submissions').update({
        status: 'rejected',
        feedback
      }).eq('id', submissionId);
    }
    
    revalidatePath('/instructor/submissions');
    revalidatePath('/instructor');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Review Submissions</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <SubmissionsListClient submissions={submissions || []} reviewSubmissionAction={reviewSubmission} />

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            {page > 1 && (
              <Link href={`/instructor/submissions?page=${page - 1}`}>
                <Button variant="secondary" size="sm">Previous Page</Button>
              </Link>
            )}
            <span style={{ padding: 'var(--space-xs) var(--space-sm)', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`/instructor/submissions?page=${page + 1}`}>
                <Button variant="secondary" size="sm">Next Page</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


