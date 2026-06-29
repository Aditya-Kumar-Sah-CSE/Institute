'use server';

import { createClient } from '@/lib/supabase/server';
import { getOrCreateProfile } from '@/lib/profile';

export async function recordProfileView(viewedId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };
    if (user.id === viewedId) return { success: true, message: 'Self view' }; // don't notify for self view

    const profile = await getOrCreateProfile(user);
    if (!profile) return { success: false, error: 'Profile not found' };

    // Check if we already notified this user recently to avoid spam (e.g., within the last 12 hours)
    // We can just check the feedbacks table for a Notification from this viewer to this viewed user.
    // Wait, the feedbacks table only has 'user_id' which is the RECEIVER in this case.
    // The message string contains the viewer's ID. We can check if such a message exists recently.
    const messageTemplate = `Your profile was viewed by ${profile.name}.`;
    
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const { data: recentViews } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('user_id', viewedId)
      .eq('category', 'Notification')
      .ilike('message', `${messageTemplate}%`)
      .gte('created_at', twelveHoursAgo.toISOString())
      .limit(1);

    if (recentViews && recentViews.length > 0) {
      return { success: true, message: 'Already notified recently' };
    }

    // Insert the notification
    const { error: insertError } = await supabase
      .from('feedbacks')
      .insert({
        user_id: viewedId, // The receiver
        name: 'System',
        role: 'System',
        category: 'Notification',
        message: `${messageTemplate} <a href="/users/${user.id}" class="text-gradient" style="text-decoration: underline;">Click here to view their profile back!</a>`,
        status: 'open'
      });

    if (insertError) {
      console.error('Error inserting profile view notification:', insertError);
      return { success: false, error: 'Database error' };
    }

    return { success: true };
  } catch (error) {
    console.error('Record profile view error:', error);
    return { success: false, error: 'Internal server error' };
  }
}
