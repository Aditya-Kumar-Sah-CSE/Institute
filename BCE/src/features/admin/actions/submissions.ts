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

    // Notify the student
    await sb.from('notifications').insert({
      user_id: sub.user_id,
      type: 'notice',
      message: `Your assignment "${sub.assignments.title}" has been approved! Earned ${sub.assignments.xp_reward} XP.`,
      link: '/dashboard'
    });
  } else {
    await sb.from('submissions').update({
      status: 'rejected',
      feedback
    }).eq('id', submissionId);

    // Notify the student
    await sb.from('notifications').insert({
      user_id: sub.user_id,
      type: 'notice',
      message: `Your assignment "${sub.assignments.title}" was returned. Instructor Feedback: ${feedback}`,
      link: '/dashboard'
    });
  }
  
  revalidatePath('/admin/submissions');
  revalidatePath('/instructor/submissions');
  revalidatePath('/admin/courses/[courseId]/builder', 'page');
  revalidatePath('/instructor/courses/[courseId]/builder', 'page');
  
  return { success: true };
}
