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

  if (!content.trim()) throw new Error('Message cannot be empty');

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      content: content.trim(),
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

/**
 * Creates a new group conversation server-side.
 * Runs with the authenticated Supabase client so RLS policies pass correctly.
 */
export async function createGroupChat(groupName: string, memberIds: string[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const currentUserId = userData.user.id;
  
  const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', currentUserId).single();
  const institutionId = profile?.institution_id || null;

  if (!groupName.trim()) throw new Error('Group name is required');
  if (memberIds.length === 0) throw new Error('At least one member is required');

  // Create conversation
  const { data: conv, error: convError } = await supabase
    .from('chat_conversations')
    .insert({
      type: 'group',
      name: groupName.trim(),
      is_private: true,
      created_by: currentUserId,
      institution_id: institutionId
    })
    .select('id')
    .single();

  if (convError) throw new Error(`Failed to create group: ${convError.message}`);

  // Deduplicate members and always include the creator as owner
  const uniqueMemberIds = Array.from(new Set(memberIds.filter(id => id !== currentUserId)));
  const members = [
    { conversation_id: conv.id, user_id: currentUserId, role: 'founder' },
    ...uniqueMemberIds.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'member' })),
  ];

  const { error: membersError } = await supabase.from('chat_members').insert(members);
  if (membersError) {
    // Rollback the group creation if members fail
    await supabase.from('chat_conversations').delete().eq('id', conv.id);
    throw new Error(`Failed to add members: ${membersError.message}`);
  }

  revalidatePath('/dashboard/chat');
  return conv.id;
}

export async function updateGroupRole(conversationId: string, targetUserId: string, newRole: 'founder' | 'co-founder' | 'admin' | 'member') {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // Verify permission
  const { data: myMember } = await supabase.from('chat_members')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', userData.user.id)
    .single();

  if (!myMember || !['founder', 'co-founder'].includes(myMember.role)) {
    throw new Error('Not enough permissions');
  }

  if (myMember.role === 'co-founder' && newRole === 'founder') {
     throw new Error('Co-founders cannot promote someone to Founder');
  }

  const { error } = await supabase.from('chat_members')
    .update({ role: newRole })
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId);
    
  if (error) throw error;
  return true;
}

export async function removeGroupMember(conversationId: string, targetUserId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  if (userData.user.id !== targetUserId) {
    const { data: myMember } = await supabase.from('chat_members')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userData.user.id)
      .single();

    if (!myMember || !['founder', 'co-founder', 'admin'].includes(myMember.role)) {
      throw new Error('Not enough permissions to kick members');
    }
  }

  const { error } = await supabase.from('chat_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', targetUserId);
    
  if (error) throw error;
  return true;
}

export async function updateGroupSettings(conversationId: string, updates: { name?: string, icon_url?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  // Verify permission
  const { data: myMember } = await supabase.from('chat_members')
    .select('role')
    .eq('conversation_id', conversationId)
    .eq('user_id', userData.user.id)
    .single();

  if (!myMember || !['founder', 'co-founder', 'admin'].includes(myMember.role)) {
    throw new Error('Not enough permissions to edit group settings');
  }

  const { error } = await supabase
    .from('chat_conversations')
    .update({ 
       ...(updates.name && { name: updates.name.trim() }),
       ...(updates.icon_url !== undefined && { icon_url: updates.icon_url }),
       updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  if (error) throw error;
  revalidatePath('/dashboard/chat');
  return true;
}
