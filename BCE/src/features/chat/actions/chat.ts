'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import type { ChatConversation, ChatMessage } from '@/types/database';

export async function fetchUserChats(): Promise<ChatConversation[]> {
  noStore();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const { data: members } = await supabase
    .from('chat_members')
    .select('conversation_id')
    .eq('user_id', userData.user.id);

  if (!members || members.length === 0) return [];

  const chatIds = members.map((p) => p.conversation_id);

  const { data: chats, error } = await supabase
    .from('chat_conversations')
    .select(`
      *,
      members:chat_members(
        conversation_id, user_id, role, last_read_message_id, joined_at, is_pinned,
        profile:profiles!chat_members_user_id_fkey(id, name, avatar_url, role, level)
      )
    `)
    .in('id', chatIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    return [];
  }

  return chats as unknown as ChatConversation[];
}

export async function createDirectChat(targetUserId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { data: convId } = await supabase.rpc('get_or_create_direct_chat', {
    peer_id: targetUserId,
  }).single();

  revalidatePath('/dashboard/chat');
  return convId;
}

export async function fetchChatMessages(conversationId: string): Promise<ChatMessage[]> {
  noStore();
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role),
      reply_to:chat_messages!reply_to_id(
        id, content, sender_id, attachment_type, attachment_link,
        sender:profiles!chat_messages_sender_id_fkey(name)
      ),
      reactions:message_reactions(message_id, user_id, emoji)
    `)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_everyone', false)
    .order('created_at', { ascending: true })
    .limit(150);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data as unknown as ChatMessage[];
}

export async function sendChatMessage(
  conversationId: string, 
  content: string, 
  attachmentType?: any, 
  attachmentLink?: string,
  replyToId?: string
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { checkRateLimit } = await import('@/lib/rate-limit');
  const rl = checkRateLimit(`chatMsg:${userData.user.id}`, 60, 60000);
  if (!rl.success) throw new Error(rl.error);

  if (!content.trim() && !attachmentLink) throw new Error('Message cannot be empty');

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content: content.trim() || null,
      attachment_type: attachmentType || null,
      attachment_link: attachmentLink || null,
      reply_to_id: replyToId || null
    });

  if (error) throw new Error(error.message);
  
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath(`/dashboard/chat`);
}

export async function editChatMessage(messageId: string, newContent: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  if (!newContent.trim()) throw new Error('Message content cannot be empty');

  const { error } = await supabase
    .from('chat_messages')
    .update({
      content: newContent.trim(),
      is_edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('sender_id', userData.user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/chat`);
}

export async function deleteChatMessage(messageId: string, deleteForEveryone: boolean = true) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  if (deleteForEveryone) {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        deleted_for_everyone: true,
        content: 'This message was deleted',
        attachment_type: null,
        attachment_link: null
      })
      .eq('id', messageId)
      .eq('sender_id', userData.user.id);

    if (error) throw new Error(error.message);
  } else {
    // Soft hide for current user if applicable
  }
  revalidatePath(`/dashboard/chat`);
}

export async function togglePinChatMessage(messageId: string, currentPinStatus: boolean) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('chat_messages')
    .update({ is_pinned: !currentPinStatus })
    .eq('id', messageId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/chat`);
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', userData.user.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userData.user.id)
      .eq('emoji', emoji);
  } else {
    await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userData.user.id,
        emoji
      });
  }
  revalidatePath(`/dashboard/chat`);
}

export async function createGroupChat(groupName: string, memberIds: string[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const currentUserId = userData.user.id;

  if (!groupName.trim()) throw new Error('Group name is required');
  if (memberIds.length === 0) throw new Error('At least one member is required');

  const { data: conv, error: convError } = await supabase
    .from('chat_conversations')
    .insert({
      type: 'group',
      name: groupName.trim(),
      is_private: true,
      created_by: currentUserId,
    })
    .select('id')
    .single();

  if (convError) throw new Error(`Failed to create group: ${convError.message}`);

  const uniqueMemberIds = Array.from(new Set(memberIds.filter(id => id !== currentUserId)));
  const members = [
    { conversation_id: conv.id, user_id: currentUserId, role: 'owner' },
    ...uniqueMemberIds.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'member' })),
  ];

  const { error: membersError } = await supabase.from('chat_members').insert(members);
  if (membersError) {
    await supabase.from('chat_conversations').delete().eq('id', conv.id);
    throw new Error(`Failed to add members: ${membersError.message}`);
  }

  revalidatePath('/dashboard/chat');
  return conv.id;
}
