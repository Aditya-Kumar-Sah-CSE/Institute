'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import type { ChatConversation, ChatMessage, ChatMember } from '@/types/database';

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
        conversation_id, user_id, role, last_read_message_id, joined_at,
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

  // Uses RPC we defined in V2 migration
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
      sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role)
    `)
    .eq('conversation_id', conversationId)
    .eq('deleted_for_everyone', false)
    .order('created_at', { ascending: true })
    .limit(100); // Pagination ready for later

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data as ChatMessage[];
}

export async function sendChatMessage(conversationId: string, content: string, attachmentType?: any, attachmentLink?: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // In production, we'd wrap this with real-time broadcast and optimistic updates
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content,
      attachment_type: attachmentType || null,
      attachment_link: attachmentLink || null
    });

  if (error) throw new Error(error.message);
  
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath(`/dashboard/chat`);
}
