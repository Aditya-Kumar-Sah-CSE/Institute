import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { awardXP } from '@/features/auth/actions/auth';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

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
        {submissions && submissions.length > 0 ? submissions.map(sub => (
          <Card key={sub.id} variant="glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <div>
                <h3 style={{ margin: 0 }}>{sub.assignments.title}</h3>
                <p className="text-secondary text-sm">By {sub.profiles?.name} ({sub.profiles?.email})</p>
              </div>
              <div className="text-gradient" style={{ fontWeight: 'bold' }}>
                +{sub.assignments?.xp_reward} XP
              </div>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
              <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)', textTransform: 'uppercase' }}>Submission Data</div>
              {!sub.github_link && !sub.deploy_link && !sub.answer && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No submission data provided. The upload may have failed.
                </div>
              )}
              {sub.github_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>GitHub:</strong> <a href={sub.github_link} target="_blank" rel="noreferrer">{sub.github_link}</a></div>}
              {sub.deploy_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>Deploy:</strong> <a href={sub.deploy_link} target="_blank" rel="noreferrer">{sub.deploy_link}</a></div>}
              {sub.answer && (
                <div>
                  <strong>Answer:</strong> 
                  {sub.assignments?.type === 'ui' ? (
                    <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                      {(() => {
                        let urls: string[] = [];
                        try {
                          const parsed = typeof sub.answer === 'string' ? JSON.parse(sub.answer) : sub.answer;
                          urls = Array.isArray(parsed) ? parsed : [String(sub.answer)];
                        } catch {
                          urls = [String(sub.answer)];
                        }
                        return urls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--bg-primary)', background: 'var(--neon-cyan)', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                            📄 View File {idx + 1}
                          </a>
                        ));
                      })()}
                    </div>
                  ) : (
                    <pre style={{ background: 'var(--bg-input)', padding: 'var(--space-sm)', marginTop: 'var(--space-xs)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                      {typeof sub.answer === 'string' ? sub.answer : JSON.stringify(sub.answer, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <form action={reviewSubmission} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <input type="hidden" name="submissionId" value={sub.id} />
              <textarea 
                name="feedback" 
                placeholder="Optional feedback..." 
                style={{ width: '100%', padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                <Button type="submit" name="action" value="reject" variant="danger" size="sm" confirmMessage="Are you sure you want to reject this assignment?">Reject / Needs Work</Button>
                <Button type="submit" name="action" value="approve" variant="success" size="sm" confirmMessage="Are you sure you want to approve this assignment?">Approve & Award XP</Button>
              </div>
            </form>
          </Card>
        )) : (
          <Card variant="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎉</div>
            <p>All caught up! No pending submissions to review.</p>
          </Card>
        )}

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
