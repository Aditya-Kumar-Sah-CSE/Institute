import { createClient, createAdminClient } from '@/lib/supabase/server';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { awardXP } from '@/features/auth/actions/auth';
import { revalidatePath } from 'next/cache';

import Link from 'next/link';
import SubmissionsReviewTabs from '@/features/admin/components/SubmissionsReviewTabs';

export const dynamic = 'force-dynamic';

export default async function SubmissionsPage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const supabase = await createClient();
  // Use admin client for fetching submissions so instructors can see student submissions (bypasses RLS)
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

  const query = adminSupabase
    .from('submissions')
    .select('*, profiles(name, email), assignments(title, type, xp_reward)', { count: 'exact' })
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .range(start, end);

  const { data: submissions, count } = await query;
  const { data: pendingApps } = await adminSupabase
    .from('student_apps')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  const totalPages = Math.ceil((count || 0) / limit);

  async function reviewSubmission(formData: FormData) {
    'use server';
    const sb = await createAdminClient();
    const submissionId = formData.get('submissionId') as string;
    const action = formData.get('action') as 'approve' | 'reject';
    const feedback = formData.get('feedback') as string;

    const { data: sub } = await sb.from('submissions').select('*, assignments(xp_reward, title)').eq('id', submissionId).single();
    if (!sub) return;

    if (action === 'approve') {
      await awardXP(sub.user_id, sub.assignments.xp_reward, `Approved Assignment: ${sub.assignments.title}`, 'assignment', sub.assignments.id);
      
      // Update the submission status to approved (keeps DB history for community view)
      await sb.from('submissions').update({ status: 'approved', feedback }).eq('id', submissionId);

      // Check for any new badges earned from this submission or XP gain
      const { checkBadges } = await import('@/features/gamification/actions/gamification');
      await checkBadges(sub.user_id);
    } else {
      await sb.from('submissions').update({
        status: 'rejected',
        feedback
      }).eq('id', submissionId);
    }
    
    revalidatePath('/admin/submissions');
    revalidatePath('/instructor/submissions');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Review Submissions</h1>
      </div>

      <SubmissionsReviewTabs
        submissions={submissions || []}
        reviewSubmissionAction={reviewSubmission}
        pendingApps={pendingApps || []}
        totalPages={totalPages}
        currentPage={page}
        basePath="/admin/submissions"
      />
    </div>
  );
}


