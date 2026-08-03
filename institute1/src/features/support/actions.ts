'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitSupportTicket(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // Explicitly use service role bypass if normal client RLS is strict,
    // though the DB policy currently says 'Anyone can submit...'
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string || 'General Support';
    const message = formData.get('message') as string;
    
    if (!name || !email || !message) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    const { error } = await supabase
      .from('support_tickets')
      .insert([
        {
          name,
          email,
          subject,
          message,
          status: 'Pending'
        }
      ]);

    if (error) {
      console.error('Support ticket insertion error:', error);
      return { success: false, error: 'Failed to submit your request. Please try again later.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting support ticket:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function fetchAllSupportTickets() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching support tickets:', error);
    return [];
  }
  
  return data || [];
}

export async function resolveSupportTicket(ticketId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'Resolved' })
    .eq('id', ticketId);
    
  if (error) {
    console.error('Error resolving support ticket:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/feedback');
  return { success: true };
}
