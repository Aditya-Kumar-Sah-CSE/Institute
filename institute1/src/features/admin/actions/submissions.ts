'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { awardXP } from '@/features/auth/actions/auth';
import { revalidatePath } from 'next/cache';

export async function reviewSubmissionAction(formData: FormData) {
  const sb = await createAdminClient();
  const submissionId = formData.get('submissionId') as string;
  const action = formData.get('action') as 'approve' | 'reject';
  const feedback = formData.get('feedback') as string;

  const { data: sub } = await sb.from('submissions').select('*, assignments(xp_reward, title)').eq('id', submissionId).single();
  if (!sub) return { error: 'Submission not found' };

  if (action === 'approve') {
    await awardXP(sub.user_id, sub.assignments.xp_reward, `Approved Assignment: ${sub.assignments.title}`, 'assignment', sub.assignments.id);
    
    // Update the submission status to approved
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
  revalidatePath('/admin/courses/[courseId]/builder', 'page');
  revalidatePath('/instructor/courses/[courseId]/builder', 'page');
  
  return { success: true };
}
