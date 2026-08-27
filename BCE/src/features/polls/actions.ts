'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

export async function getGlobalPolls() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('global_polls')
    .select(`
      *,
      profiles:created_by ( name, role, email ),
      options:global_poll_options (
        id,
        option_text,
        votes:global_poll_votes (
          id,
          user_id,
          profiles:user_id ( name )
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching global polls:', error);
    return [];
  }

  return data || [];
}

export async function createGlobalPoll(
  question: string,
  options: string[],
  isMultipleChoice: boolean,
  expiresInDays: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Double check authorization on the server side
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  const authorizedRoles = ['admin', 'instructor', 'developer', 'superadmin', 'super_admin'];
  const isAuthorized = 
    profile && (
      authorizedRoles.includes(profile.role) || 
      profile.email?.trim().toLowerCase() === 'iambestadi@gmail.com'
    );

  if (!isAuthorized) {
    return { error: 'Unauthorized to create global polls' };
  }

  if (!question || !options || options.length < 2) {
    return { error: 'Question and at least two options are required' };
  }

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 1. Insert poll
    const { data: poll, error: pollError } = await supabase
      .from('global_polls')
      .insert({
        created_by: user.id,
        question,
        is_multiple_choice: isMultipleChoice,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (pollError || !poll) throw pollError || new Error('Failed to create poll');

    // 2. Insert options
    const optionsData = options.map(opt => ({
      poll_id: poll.id,
      option_text: opt
    }));

    const { error: optionsError } = await supabase
      .from('global_poll_options')
      .insert(optionsData);

    if (optionsError) throw optionsError;

    // Notifications are handled automatically by the DB trigger `trigger_notify_on_new_global_poll`

    revalidatePath('/dashboard');
    revalidatePath('/polls');
    revalidatePath('/admin/polls');
    revalidatePath('/instructor/polls');
    return { success: true, poll };
  } catch (error: any) {
    console.error('Error creating global poll:', error);
    return { error: error.message || 'Failed to create poll' };
  }
}

export async function submitGlobalPollVote(pollId: string, optionIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // 1. Check for existing votes and delete them
    const { data: pollOptions } = await supabase
      .from('global_poll_options')
      .select('id')
      .eq('poll_id', pollId);

    let hadPriorVote = false;

    if (pollOptions && pollOptions.length > 0) {
      const optionIdsForPoll = pollOptions.map(o => o.id);

      const { data: priorVotes } = await supabase
        .from('global_poll_votes')
        .select('id')
        .eq('user_id', user.id)
        .in('option_id', optionIdsForPoll);

      if (priorVotes && priorVotes.length > 0) {
        hadPriorVote = true;
      }

      await supabase
        .from('global_poll_votes')
        .delete()
        .eq('user_id', user.id)
        .in('option_id', optionIdsForPoll);
    }

    // 2. Insert the new votes
    if (optionIds.length > 0) {
      const votesData = optionIds.map(optId => ({
        poll_id: pollId,
        option_id: optId,
        user_id: user.id
      }));

      const { error: voteError } = await supabase
        .from('global_poll_votes')
        .insert(votesData);

      if (voteError) throw voteError;

      // 3. Award XP and notify if voting for the first time
      if (!hadPriorVote) {
        await awardXP(user.id, XP_VALUES.POLL_VOTE, 'Participated in a global poll', 'global_poll_vote', pollId);

        // Notify the poll creator
        const { data: poll } = await supabase.from('global_polls').select('created_by, question').eq('id', pollId).single();
        if (poll && poll.created_by !== user.id) {
          const { data: voterProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
          await supabase.from('notifications').insert({
            user_id: poll.created_by,
            type: 'poll_vote',
            message: `${voterProfile?.name} voted on your global poll: "${poll.question}"`,
            link: '/polls'
          });
        }
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/polls');
    revalidatePath('/admin/polls');
    revalidatePath('/instructor/polls');
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting vote on global poll:', error);
    return { error: error.message || 'Failed to submit vote' };
  }
}

export async function deleteGlobalPoll(pollId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('global_polls')
      .delete()
      .eq('id', pollId);

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/polls');
    revalidatePath('/admin/polls');
    revalidatePath('/instructor/polls');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting global poll:', error);
    return { error: error.message || 'Failed to delete poll' };
  }
}
