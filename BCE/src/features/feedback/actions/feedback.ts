'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

// Authorization helper — only admin/instructor can manage feedbacks
async function requireFeedbackManageRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) {
    throw new Error('Unauthorized: admin or instructor role required');
  }

  return { supabase, user };
}

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient();
  
  // Get user if logged in, but don't require it
  const { data: { user } } = await supabase.auth.getUser();

  // Rate Limiting: 3 feedbacks per minute per IP/Session
  const { checkRateLimit } = await import('@/lib/rate-limit');
  const identifier = user?.id || 'anonymous';
  const rl = checkRateLimit(`submitFeedback:${identifier}`, 3, 60000);
  if (!rl.success) {
    return { error: rl.error };
  }

  const name = formData.get('name') as string;
  const role = formData.get('role') as string;
  const category = formData.get('category') as string;
  const message = formData.get('message') as string;

  if (!name || !role || !category || !message) {
    return { error: 'All fields are required.' };
  }

  const { error } = await supabase
    .from('feedbacks')
    .insert({
      user_id: user?.id || null,
      name,
      role,
      category,
      message,
      status: 'open',
      image_url: formData.get('image_url') as string || null
    })
    .select('id')
    .single();

  if (error) {
    console.error('Feedback submission error:', error);
    return { error: 'Failed to submit feedback. Please try again.' };
  }

  // Reward XP
  if (user) {
    await awardXP(user.id, XP_VALUES.FEEDBACK_SUBMIT, 'Submitted feedback', 'feedback', error ? '' : 'fb');
  }

  return { success: true };
}

export async function getFeedbacks(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data: feedbacks, error, count } = await supabase
    .from('feedbacks')
    .select('*', { count: 'exact' })
    .neq('category', 'Notification')
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) return { error: error.message };

  return { data: feedbacks, count, limit };
}

export async function replyToFeedback(feedbackId: string, replyMessage: string) {
  const { supabase } = await requireFeedbackManageRole();
  const { error } = await supabase
    .from('feedbacks')
    .update({ 
      status: 'resolved',
      admin_reply: replyMessage,
      replied_at: new Date().toISOString()
    })
    .eq('id', feedbackId);

  if (error) return { error: error.message };

  revalidatePath('/admin/feedback');
  revalidatePath('/instructor/feedback');
  return { success: true };
}

export async function getUserFeedbacks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  const { data: feedbacks, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  return { data: feedbacks };
}

export async function resolveFeedback(feedbackId: string) {
  const { supabase } = await requireFeedbackManageRole();
  
  const { error } = await supabase
    .from('feedbacks')
    .update({ status: 'resolved' })
    .eq('id', feedbackId);

  if (error) return { error: error.message };

  revalidatePath('/admin/feedback');
  revalidatePath('/instructor/feedback');
  return { success: true };
}

export async function deleteFeedback(feedbackId: string) {
  const { supabase } = await requireFeedbackManageRole();
  
  const { error } = await supabase
    .from('feedbacks')
    .delete()
    .eq('id', feedbackId);

  if (error) return { error: error.message };

  revalidatePath('/admin/feedback');
  revalidatePath('/instructor/feedback');
  return { success: true };
}
