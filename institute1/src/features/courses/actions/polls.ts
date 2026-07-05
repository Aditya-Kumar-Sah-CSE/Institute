'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

export async function createCoursePoll(
  courseId: string, 
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

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 1. Insert poll
    const { data: poll, error: pollError } = await supabase
      .from('course_polls')
      .insert({
        course_id: courseId,
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
      .from('course_poll_options')
      .insert(optionsData);

    if (optionsError) throw optionsError;

    // 3. Notify enrolled students and course creator
    const { data: course } = await supabase
      .from('courses')
      .select('title, created_by')
      .eq('id', courseId)
      .single();

    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'approved');

    if (course) {
      const userIdsToNotify = new Set<string>();
      
      if (enrollments) {
        enrollments.forEach(e => userIdsToNotify.add(e.user_id));
      }
      
      if (course.created_by) {
        userIdsToNotify.add(course.created_by);
      }
      
      // Do not notify the person who created the poll
      userIdsToNotify.delete(user.id);

      const notifications = Array.from(userIdsToNotify).map(userId => ({
        user_id: userId,
        type: 'poll',
        message: `A new poll has been added to ${course.title}: "${question}"`,
        link: `/courses/${courseId}`
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }

    revalidatePath(`/courses/${courseId}`);
    return { success: true, poll };
  } catch (error: any) {
    console.error('Error creating poll:', error);
    return { error: error.message || 'Failed to create poll' };
  }
}

export async function submitPollVote(pollId: string, optionIds: string[], courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // First, check for existing votes and delete them
    const { data: pollOptions } = await supabase
      .from('course_poll_options')
      .select('id')
      .eq('poll_id', pollId);
      
    let hadPriorVote = false;
      
    if (pollOptions && pollOptions.length > 0) {
      const optionIdsForPoll = pollOptions.map(o => o.id);
      
      const { data: priorVotes } = await supabase
        .from('course_poll_votes')
        .select('id')
        .eq('user_id', user.id)
        .in('option_id', optionIdsForPoll);
        
      if (priorVotes && priorVotes.length > 0) {
        hadPriorVote = true;
      }
      
      await supabase
        .from('course_poll_votes')
        .delete()
        .eq('user_id', user.id)
        .in('option_id', optionIdsForPoll);
    }

    // Now insert the new votes
    if (optionIds.length > 0) {
      const votesData = optionIds.map(optId => ({
        poll_id: pollId,
        option_id: optId,
        user_id: user.id
      }));

      const { error: voteError } = await supabase
        .from('course_poll_votes')
        .insert(votesData);

      if (voteError) throw voteError;
      
      if (!hadPriorVote) {
        await awardXP(user.id, XP_VALUES.POLL_VOTE, 'Participated in a poll', 'poll_vote', pollId);
        
        // Notify the poll creator
        const { data: poll } = await supabase.from('course_polls').select('created_by, question').eq('id', pollId).single();
        if (poll && poll.created_by !== user.id) {
           const { data: voterProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
           await supabase.from('notifications').insert({
             user_id: poll.created_by,
             type: 'poll_vote',
             message: `${voterProfile?.name} voted on your poll: "${poll.question}"`,
             link: `/courses/${courseId}`
           });
        }
      }
    }

    revalidatePath(`/courses/${courseId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting vote:', error);
    return { error: error.message || 'Failed to submit vote' };
  }
}

export async function getCoursePolls(courseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('course_polls')
    .select(`
      *,
      profiles:created_by ( name ),
      options:course_poll_options (
        id,
        option_text,
        votes:course_poll_votes (
          id,
          user_id,
          profiles:user_id ( name )
        )
      )
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching polls:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteCoursePoll(pollId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('course_polls')
      .delete()
      .eq('id', pollId);

    if (error) throw error;

    revalidatePath(`/courses/${courseId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting poll:', error);
    return { error: error.message || 'Failed to delete poll' };
  }
}

export async function getDashboardPolls(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return { data: null, error: null };
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('course_polls')
    .select(`
      *,
      courses ( title ),
      profiles:created_by ( name ),
      options:course_poll_options (
        id,
        option_text,
        votes:course_poll_votes (
          id,
          user_id,
          profiles:user_id ( name )
        )
      )
    `)
    .in('course_id', courseIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dashboard polls:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
