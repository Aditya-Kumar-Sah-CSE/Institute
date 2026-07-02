'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { awardXP } from '@/features/auth/actions/auth';
import { XP_VALUES } from '@/lib/constants';

// Helper to create notifications
async function createNotification(supabase: any, userId: string, type: string, message: string, link: string) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    link
  });
}

export async function createDoubt(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabase.from('profiles').select('graduation_period, role, name').eq('id', user.id).single();

  if (!profile) return { error: 'Profile not found' };
  
  if (profile.role !== 'admin' && profile.role !== 'instructor' && !profile.graduation_period) {
    return { error: 'You need to have a batch (graduation period) set to ask doubts.' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const courseId = formData.get('course_id') as string | null;
  const lessonId = formData.get('lesson_id') as string | null;
  
  let batch = profile.graduation_period;
  if (profile.role === 'admin' || profile.role === 'instructor') {
      const formBatch = formData.get('batch') as string;
      if (formBatch) batch = formBatch;
  }

  if (!title || !description || !batch) {
    return { error: 'Title, description, and batch are required.' };
  }

  const { data: doubt, error } = await supabase
    .from('doubts')
    .insert({
      user_id: user.id,
      batch: batch,
      title,
      description,
      course_id: courseId || null,
      lesson_id: lessonId || null,
      status: 'open'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Create doubt error:', error);
    return { error: 'Failed to create doubt.' };
  }

  // Tags processing
  const tagsStr = formData.get('tags') as string;
  if (tagsStr) {
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      const tagInserts = tags.map(tag => ({ doubt_id: doubt.id, tag_name: tag }));
      await supabase.from('doubt_tags').insert(tagInserts);
    }
  }

  await awardXP(user.id, XP_VALUES.ASK_DOUBT, 'Asked a Doubt', 'doubt', doubt.id);

  // Notify joined students and course faculty
  const userIdsToNotify = new Set<string>();

  if (courseId) {
    // It's a course doubt: fetch enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'approved');

    if (enrollments) {
      enrollments.forEach(e => userIdsToNotify.add(e.user_id));
    }

    // Fetch course faculty
    const { data: course } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', courseId)
      .single();

    if (course && course.created_by) {
      userIdsToNotify.add(course.created_by);
    }
  } else {
    // It's a batch doubt: fetch all students in the batch
    const { data: batchStudents } = await supabase
      .from('profiles')
      .select('id')
      .eq('graduation_period', batch)
      .eq('role', 'student');

    if (batchStudents) {
      batchStudents.forEach(s => userIdsToNotify.add(s.id));
    }
  }

  // Do not notify the person asking the doubt
  userIdsToNotify.delete(user.id);

  if (userIdsToNotify.size > 0) {
    const notifications = Array.from(userIdsToNotify).map(uid => ({
      user_id: uid,
      type: 'new_doubt',
      message: `New doubt posted by ${profile.name} in batch ${batch}`,
      link: `/doubts/${doubt.id}`
    }));
    await supabase.from('notifications').insert(notifications);
  }

  revalidatePath('/doubts');
  return { success: true, doubtId: doubt.id };
}

export async function replyToDoubt(doubtId: string, replyText: string, parentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  if (!replyText || !replyText.trim()) {
    return { error: 'Reply text is required' };
  }
  
  const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
  const isFaculty = profile?.role === 'admin' || profile?.role === 'instructor';

  const { data: reply, error } = await supabase
    .from('doubt_replies')
    .insert({
      doubt_id: doubtId,
      user_id: user.id,
      reply_text: replyText.trim(),
      parent_id: parentId || null,
      is_official: isFaculty
    })
    .select('id')
    .single();

  if (error) {
    console.error('Reply doubt error:', error);
    return { error: 'Failed to reply to doubt.' };
  }

  await awardXP(user.id, XP_VALUES.REPLY_DOUBT, 'Replied to a Doubt', 'doubt_reply', reply.id);

  // Notify doubt author
  const { data: doubt } = await supabase.from('doubts').select('user_id').eq('id', doubtId).single();
  if (doubt && doubt.user_id !== user.id && !parentId) {
    await createNotification(
      supabase,
      doubt.user_id,
      isFaculty ? 'faculty_reply' : 'reply',
      `${profile?.name} replied to your doubt`,
      `/doubts/${doubtId}`
    );
  }

  // Notify parent reply author if nested
  if (parentId) {
    const { data: parentReply } = await supabase.from('doubt_replies').select('user_id').eq('id', parentId).single();
    if (parentReply && parentReply.user_id !== user.id) {
      await createNotification(
        supabase,
        parentReply.user_id,
        'reply',
        `${profile?.name} replied to your comment`,
        `/doubts/${doubtId}`
      );
    }
  }

  revalidatePath(`/doubts/${doubtId}`);
  return { success: true };
}

export async function markReplyAsAccepted(doubtId: string, replyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not logged in' };

  // Update doubt status to resolved
  const { error: doubtErr } = await supabase
    .from('doubts')
    .update({ status: 'resolved' })
    .eq('id', doubtId)
    .eq('user_id', user.id); 

  if (doubtErr) return { error: doubtErr.message };

  const { data: reply, error } = await supabase
    .from('doubt_replies')
    .update({ is_accepted: true })
    .eq('id', replyId)
    .eq('doubt_id', doubtId)
    .select('user_id')
    .single();

  if (error) return { error: error.message };

  if (reply && reply.user_id !== user.id) {
    // Check if reply author is faculty
    const { data: replyAuthor } = await supabase.from('profiles').select('role').eq('id', reply.user_id).single();
    const isFaculty = replyAuthor?.role === 'admin' || replyAuthor?.role === 'instructor';
    const xpReward = isFaculty ? XP_VALUES.FACULTY_ACCEPTED : XP_VALUES.ACCEPTED_ANSWER;
    
    await awardXP(reply.user_id, xpReward, 'Answer Accepted', 'doubt_reply', replyId);
    
    await createNotification(
      supabase,
      reply.user_id,
      'accepted',
      `Your reply was marked as accepted!`,
      `/doubts/${doubtId}`
    );
  }

  revalidatePath(`/doubts/${doubtId}`);
  return { success: true };
}

export async function toggleReplyVote(replyId: string, voteType: 'upvote' | 'downvote') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: existingVote } = await supabase
    .from('reply_votes')
    .select('*')
    .eq('reply_id', replyId)
    .eq('user_id', user.id)
    .single();

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Toggle off
      await supabase.from('reply_votes').delete().eq('id', existingVote.id);
      if (existingVote.vote_type === 'upvote') {
        await awardXP(user.id, -XP_VALUES.LIKE_DOUBT, 'Removed Upvote', 'reply_unvote', replyId);
      }
    } else {
      // Change vote
      await supabase.from('reply_votes').update({ vote_type: voteType }).eq('id', existingVote.id);
      if (voteType === 'upvote') {
        await awardXP(user.id, XP_VALUES.LIKE_DOUBT, 'Upvoted a Reply', 'reply_vote', replyId);
      } else if (voteType === 'downvote' && existingVote.vote_type === 'upvote') {
        await awardXP(user.id, -XP_VALUES.LIKE_DOUBT, 'Removed Upvote', 'reply_unvote', replyId);
      }
    }
  } else {
    // New vote
    await supabase.from('reply_votes').insert({
      reply_id: replyId,
      user_id: user.id,
      vote_type: voteType
    });
    
    if (voteType === 'upvote') {
      await awardXP(user.id, XP_VALUES.LIKE_DOUBT, 'Upvoted a Reply', 'reply_vote', replyId);
    }
    
    // Notify author on upvote
    if (voteType === 'upvote') {
      const { data: reply } = await supabase.from('doubt_replies').select('user_id, doubt_id').eq('id', replyId).single();
      if (reply && reply.user_id !== user.id) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        await createNotification(
          supabase,
          reply.user_id,
          'upvote',
          `${profile?.name} upvoted your reply`,
          `/doubts/${reply.doubt_id}`
        );
      }
    }
  }

  // The database trigger handles the actual count update
  return { success: true };
}

export async function recordDoubtView(doubtId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  // Insert ignores duplicates due to unique constraint in RLS or DB
  await supabase.from('doubt_views').insert({
    doubt_id: doubtId,
    user_id: user.id
  });

  return { success: true };
}

export async function togglePinReply(replyId: string, doubtId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
    return { error: 'Unauthorized' };
  }

  const { data: reply } = await supabase.from('doubt_replies').select('is_pinned').eq('id', replyId).single();
  if (!reply) return { error: 'Reply not found' };

  await supabase.from('doubt_replies').update({ is_pinned: !reply.is_pinned }).eq('id', replyId);
  revalidatePath(`/doubts/${doubtId}`);
  return { success: true };
}

export async function toggleDoubtLike(doubtId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not logged in' };

  const { data: existingLike } = await supabase
    .from('doubt_likes')
    .select('*')
    .eq('doubt_id', doubtId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    // Unlike
    await supabase.from('doubt_likes').delete().eq('id', existingLike.id);
    await awardXP(user.id, -XP_VALUES.LIKE_DOUBT, 'Unliked a Doubt', 'doubt_unlike', doubtId);
  } else {
    // Like
    await supabase.from('doubt_likes').insert({
      doubt_id: doubtId,
      user_id: user.id
    });
    
    await awardXP(user.id, XP_VALUES.LIKE_DOUBT, 'Liked a Doubt', 'doubt_like', doubtId);
    
    // Notify author
    const { data: doubt } = await supabase.from('doubts').select('user_id').eq('id', doubtId).single();
    if (doubt && doubt.user_id !== user.id) {
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      await createNotification(
        supabase,
        doubt.user_id,
        'like',
        `${profile?.name} liked your doubt`,
        `/doubts/${doubtId}`
      );
    }
  }

  // Due to multiple entry points, revalidate both batch page and detail page
  revalidatePath(`/doubts/${doubtId}`);
  return { success: true };
}

export async function deleteDoubt(doubtId: string, courseId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('doubts')
      .delete()
      .eq('id', doubtId);

    if (error) throw error;

    if (courseId) {
      revalidatePath(`/courses/${courseId}`);
    }
    revalidatePath('/doubts');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting doubt:', error);
    return { error: error.message || 'Failed to delete doubt' };
  }
}

