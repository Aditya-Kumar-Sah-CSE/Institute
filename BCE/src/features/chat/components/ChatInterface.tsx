'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatConversation, ChatMessage } from '@/types/database';
import { 
  Send, User as UserIcon, Users, ArrowLeft, ChevronDown, Loader2 
} from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { Virtuoso } from 'react-virtuoso';
import NewChatModal from './NewChatModal';
import EmptyChatState from './EmptyChatState';
import MessageBubble from './MessageBubble';
import ChatComposer from './ChatComposer';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import MessageSearch from './MessageSearch';
import ChatInfoDrawer from './ChatInfoDrawer';
import LightboxModal from './LightboxModal';
import CallModal from './CallModal';
import ForwardModal from './ForwardModal';
import DateSeparator, { formatDateLabel } from './DateSeparator';
import { 
  editChatMessage, deleteChatMessage, togglePinChatMessage, toggleMessageReaction 
} from '@/features/chat/actions/chat';
import { useRouter } from 'next/navigation';
import './ChatInterface.css';

export default function ChatInterface() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  // Advanced Feature States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string } | null>(null);
  const [callConfig, setCallConfig] = useState<{ type: 'video' | 'audio'; peerName: string; peerAvatar?: string | null } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const virtuosoRef = useRef<any>(null);
  const activeChannelRef = useRef<any>(null);
  const supabase = createClient();

  // Fetch chats client-side
  const fetchChatsClient = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];
    const { data: members } = await supabase.from('chat_members').select('conversation_id').eq('user_id', userData.user.id);
    if (!members || members.length === 0) return [];
    
    const chatIds = members.map(p => p.conversation_id);
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
      
    if (error) console.error("Client fetch error:", error);
    return chats || [];
  };

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
      const userChats = await fetchChatsClient();
      setChats(userChats as any[]);
    }
    init();
  }, []);

  const fetchMessagesClient = async (conversationId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role),
        reply_to:chat_messages!chat_messages_reply_to_id_fkey(
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
       console.error("Messages fetch error:", error);
    }
    return (data as unknown as ChatMessage[]) || [];
  };

  useEffect(() => {
    if (activeChat) {
      fetchMessagesClient(activeChat.id).then(setMessages);
      setIsSearchOpen(false);
      setSearchQuery('');
      setReplyToMessage(null);
    }
  }, [activeChat]);

  // Mark latest message as read
  useEffect(() => {
    if (activeChat && messages.length > 0 && currentUserId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        supabase
          .from('chat_members')
          .update({ last_read_message_id: lastMsg.id })
          .eq('conversation_id', activeChat.id)
          .eq('user_id', currentUserId)
          .then(() => {});
      }
    }
  }, [activeChat, messages, currentUserId]);

  const checkIsMessageRead = (msg: ChatMessage, index: number) => {
    if (!activeChat || !activeChat.members || !currentUserId) return false;
    const otherMembers = (activeChat.members as any[]).filter((m: any) => m.user_id !== currentUserId);
    if (otherMembers.length === 0) return false;

    return otherMembers.some((m: any) => {
      if (!m.last_read_message_id) return false;
      const readIdx = messages.findIndex(item => item.id === m.last_read_message_id);
      return readIdx >= index || m.last_read_message_id === msg.id;
    });
  };

  // Suggested users query
  useEffect(() => {
    async function fetchSuggestions() {
      if (!currentUserId) return;
      const { data: myEnrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', currentUserId);
      const myCourseIds = myEnrollments?.filter(e => e.course_id).map(e => e.course_id) || [];
      if (myCourseIds.length > 0) {
         const { data: peerEnrollments } = await supabase
           .from('enrollments')
           .select('user_id, profiles!inner(id, name, avatar_url, role)')
           .in('course_id', myCourseIds)
           .neq('user_id', currentUserId)
           .limit(20);
         const uniqueMap = new Map();
         peerEnrollments?.forEach((p: any) => {
           if (!uniqueMap.has(p.profiles.id)) uniqueMap.set(p.profiles.id, p.profiles);
         });
         setSuggestedUsers(Array.from(uniqueMap.values()).slice(0, 7));
      }
    }
    fetchSuggestions();
  }, [currentUserId]);

  const handleCreateSuggestedChat = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', { peer_id: userId });
      if (error || !data) return;

      const updatedChats = await fetchChatsClient();
      setChats(updatedChats as ChatConversation[]);
      const newChat = (updatedChats as ChatConversation[]).find(c => c.id === data);
      if (newChat) setActiveChat(newChat);
    } catch(e) {
      console.error(e);
    }
  };

  // Presence channel subscription
  useEffect(() => {
    if (!currentUserId) return;

    const globalChannel = supabase.channel('global_presence', {
      config: { presence: { key: currentUserId } },
    });

    globalChannel
      .on('presence', { event: 'sync' }, () => {
        const state = globalChannel.presenceState();
        const onlineIds = new Set<string>();
        Object.values(state).forEach((presences: unknown) => {
          const list = presences as unknown as { user_id: string }[];
          if (list.length > 0 && list[0].user_id) {
            onlineIds.add(list[0].user_id);
          }
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await globalChannel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [currentUserId]);

  // Real-time channel for messages & reactions
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    if (activeChannelRef.current) {
       supabase.removeChannel(activeChannelRef.current);
    }

    const channel = supabase
      .channel(`chat_${activeChat.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeChat.id}` }, () => {
        fetchMessagesClient(activeChat.id).then(setMessages);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        fetchMessagesClient(activeChat.id).then(setMessages);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const currentlyTyping: string[] = [];
        for (const [key, presences] of Object.entries(state)) {
           const list = presences as unknown as { user_id: string, typing: boolean }[];
           const presence = list[0];
           if (presence.user_id !== currentUserId && presence.typing) {
             currentlyTyping.push(presence.user_id);
           }
        }
        setTypingUsers(currentlyTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, typing: false });
        }
      });

    activeChannelRef.current = channel;

    return () => {
      if (activeChannelRef.current === channel) {
        supabase.removeChannel(channel);
        activeChannelRef.current = null;
      }
    };
  }, [activeChat, currentUserId]);

  // Broadcast typing state
  useEffect(() => {
    if (!activeChat || !currentUserId || !activeChannelRef.current) return;
    activeChannelRef.current.track({ user_id: currentUserId, typing: msgInput.trim().length > 0 });
  }, [msgInput]);

  // Message Send Action
  const handleSend = async (content: string, attachmentType?: string, attachmentLink?: string) => {
    if (!activeChat || !currentUserId) return;

    const replyId = replyToMessage?.id;
    setReplyToMessage(null);

    // Optimistic insert
    const optimisticId = Date.now().toString();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversation_id: activeChat.id,
      sender_id: currentUserId,
      content: content.trim() || null,
      attachment_type: (attachmentType as any) || null,
      attachment_link: attachmentLink || null,
      reply_to_id: replyId || null,
      is_edited: false,
      is_pinned: false,
      deleted_for_everyone: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reply_to: replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content, sender: replyToMessage.sender } : undefined
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: activeChat.id,
        sender_id: currentUserId,
        content: content.trim() || null,
        attachment_type: attachmentType || null,
        attachment_link: attachmentLink || null,
        reply_to_id: replyId || null
      });

      if (error) {
        console.error('Insert error:', error);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        return;
      }

      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeChat.id);
      fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }
  };

  // Message Actions
  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await toggleMessageReaction(msgId, emoji);
      if (activeChat) fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await editChatMessage(editingMessage.id, editText.trim());
      setEditingMessage(null);
      setEditText('');
      if (activeChat) fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err: any) {
      alert('Edit failed: ' + err.message);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message for everyone?')) return;
    try {
      await deleteChatMessage(msgId, true);
      if (activeChat) fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePin = async (msgId: string, currentPinned: boolean) => {
    try {
      await togglePinChatMessage(msgId, currentPinned);
      if (activeChat) fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err: any) {
      alert('Pin failed: ' + err.message);
    }
  };

  const handleForwardConfirm = async (targetConversationId: string) => {
    if (!forwardingMessage) return;
    await supabase.from('chat_messages').insert({
      conversation_id: targetConversationId,
      sender_id: currentUserId,
      content: forwardingMessage.content ? `[Forwarded]\n${forwardingMessage.content}` : '[Forwarded Attachment]',
      attachment_type: forwardingMessage.attachment_type,
      attachment_link: forwardingMessage.attachment_link
    });
    setForwardingMessage(null);
    alert('Message forwarded successfully!');
  };

  const getChatName = (chat: ChatConversation) => {
    if (chat.type === 'group') return chat.name || 'Group Chat';
    const otherParticipant = chat.members?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profile?.name || 'Unknown User';
  };
  
  const getChatAvatar = (chat: ChatConversation) => {
    if (chat.type === 'group') return <Users size={24} className="text-white" />;
    const otherParticipant = chat.members?.find(p => p.user_id !== currentUserId);
    if (otherParticipant?.profile) {
      return <UserAvatar url={otherParticipant.profile.avatar_url} name={otherParticipant.profile.name || 'User'} size={48} />;
    }
    return <UserIcon size={24} className="text-gray-400" />;
  };

  // Search matches inside active messages
  const matchingMessageIndices = messages.reduce((acc, msg, idx) => {
    if (searchQuery.trim() && msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      acc.push(idx);
    }
    return acc;
  }, [] as number[]);

  const handleNextMatch = () => {
    if (matchingMessageIndices.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchingMessageIndices.length;
    setCurrentMatchIndex(nextIdx);
    virtuosoRef.current?.scrollToIndex({ index: matchingMessageIndices[nextIdx], align: 'center', behavior: 'smooth' });
  };

  const handlePrevMatch = () => {
    if (matchingMessageIndices.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchingMessageIndices.length) % matchingMessageIndices.length;
    setCurrentMatchIndex(prevIdx);
    virtuosoRef.current?.scrollToIndex({ index: matchingMessageIndices[prevIdx], align: 'center', behavior: 'smooth' });
  };

  // Prepare list items with Date Separators
  const listItems: ({ type: 'date'; date: string } | { type: 'message'; data: ChatMessage; originalIndex: number })[] = [];
  let lastDateStr = '';

  messages.forEach((msg, idx) => {
    const msgDateStr = new Date(msg.created_at).toDateString();
    if (msgDateStr !== lastDateStr) {
      listItems.push({ type: 'date', date: msg.created_at });
      lastDateStr = msgDateStr;
    }
    listItems.push({ type: 'message', data: msg, originalIndex: idx });
  });

  const allMediaList = messages
    .filter(m => m.attachment_type === 'image' || m.attachment_type === 'video')
    .map(m => ({ url: m.attachment_link || '', type: m.attachment_type || 'image' }));

  return (
    <div className={`chat-container ${activeChat ? 'mobile-chat-active' : 'mobile-sidebar-active'}`}>
      <ChatSidebar 
        chats={chats}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        suggestedUsers={suggestedUsers}
        handleCreateSuggestedChat={handleCreateSuggestedChat}
        setIsNewChatModalOpen={setIsNewChatModalOpen}
        getChatAvatar={getChatAvatar}
        getChatName={getChatName}
        onlineUsers={onlineUsers}
        currentUserId={currentUserId}
      />

      {/* Main Chat Window */}
      <div className="chat-main">
        {activeChat ? (
          <>
            {/* Header */}
            <ChatHeader 
              activeChat={activeChat}
              currentUserId={currentUserId}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
              onBack={() => setActiveChat(null)}
              onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
              onStartCall={(type) => {
                const peerName = getChatName(activeChat);
                const peer = activeChat.members?.find(p => p.user_id !== currentUserId);
                setCallConfig({ type, peerName, peerAvatar: peer?.profile?.avatar_url });
              }}
              onToggleInfo={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
              onOpenParticipantsModal={() => setShowParticipantsModal(true)}
              getChatAvatar={getChatAvatar}
              getChatName={getChatName}
            />

            {/* Conversation Search Bar */}
            {isSearchOpen && (
              <MessageSearch
                searchQuery={searchQuery}
                setSearchQuery={(val) => {
                  setSearchQuery(val);
                  setCurrentMatchIndex(0);
                }}
                matchCount={matchingMessageIndices.length}
                currentMatchIndex={currentMatchIndex}
                onNextMatch={handleNextMatch}
                onPrevMatch={handlePrevMatch}
                onClose={() => setIsSearchOpen(false)}
              />
            )}

            {/* Messages Scroll Area */}
            <div style={{ flex: 1, position: 'relative', overflowY: 'hidden' }}>
               {messages.length === 0 ? (
                 <EmptyChatState onQuickReply={(text) => setMsgInput(text)} />
               ) : (
                 <div style={{ position: 'absolute', inset: 0, padding: '12px' }}>
                   <Virtuoso
                     ref={virtuosoRef}
                     data={listItems}
                     followOutput="smooth"
                     alignToBottom={true}
                     initialTopMostItemIndex={listItems.length > 0 ? listItems.length - 1 : 0}
                     style={{ height: '100%' }}
                     atBottomStateChange={(atBottom) => setShowScrollBottom(!atBottom)}
                     itemContent={(index, item) => {
                       if (item.type === 'date') {
                         return <DateSeparator key={`date-${index}`} dateStr={item.date} />;
                       }
                       const msg = item.data;
                       const isMine = msg.sender_id === currentUserId;
                       const isRead = isMine ? checkIsMessageRead(msg, item.originalIndex) : false;
                       const isGroup = activeChat.type === 'group';

                       return (
                         <MessageBubble 
                           key={msg.id} 
                           msg={msg} 
                           isMine={isMine} 
                           isRead={isRead} 
                           showSenderName={isGroup && !isMine} 
                           onReply={(m) => setReplyToMessage(m)}
                           onReact={handleReact}
                           onEdit={(m) => {
                             setEditingMessage(m);
                             setEditText(m.content || '');
                           }}
                           onDelete={handleDelete}
                           onPin={handlePin}
                           onForward={(m) => setForwardingMessage(m)}
                           onOpenLightbox={(url, type) => setLightboxMedia({ url, type })}
                         />
                       );
                     }}
                   />
                 </div>
               )}

               {/* Floating Scroll to Bottom Button */}
               {showScrollBottom && (
                 <button
                   onClick={() => virtuosoRef.current?.scrollToIndex({ index: listItems.length - 1, behavior: 'smooth' })}
                   style={{
                     position: 'absolute',
                     bottom: '16px',
                     right: '24px',
                     width: '40px',
                     height: '40px',
                     borderRadius: '50%',
                     background: 'var(--bg-secondary)',
                     border: '1px solid var(--neon-cyan)',
                     color: 'var(--neon-cyan)',
                     display: 'flex',
                     alignItems: 'center',
                     justify: 'center',
                     cursor: 'pointer',
                     boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)',
                     zIndex: 10
                   }}
                 >
                   <ChevronDown size={22} />
                 </button>
               )}
            </div>

            {/* Input Composer */}
            <ChatComposer 
              msgInput={msgInput} 
              setMsgInput={setMsgInput} 
              handleSend={handleSend} 
              isSomeoneTyping={typingUsers.length > 0} 
              replyToMessage={replyToMessage}
              onCancelReply={() => setReplyToMessage(null)}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
             <div style={{ width: '96px', height: '96px', background: 'var(--bg-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)', border: '1px solid var(--border-default)' }}>
               <Send size={40} color="var(--text-secondary)" style={{ transform: 'rotate(-15deg)' }} />
             </div>
             <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Right Slide-over Info Drawer */}
      {activeChat && (
        <ChatInfoDrawer
          isOpen={isInfoDrawerOpen}
          activeChat={activeChat}
          messages={messages}
          currentUserId={currentUserId}
          onlineUsers={onlineUsers}
          onClose={() => setIsInfoDrawerOpen(false)}
          onSelectMedia={(url, type) => setLightboxMedia({ url, type })}
        />
      )}

      {/* Lightbox Media Viewer */}
      {lightboxMedia && (
        <LightboxModal
          mediaUrl={lightboxMedia.url}
          mediaType={lightboxMedia.type as any}
          allMedia={allMediaList}
          onClose={() => setLightboxMedia(null)}
        />
      )}

      {/* Call Interface Modal */}
      {callConfig && (
        <CallModal
          type={callConfig.type}
          peerName={callConfig.peerName}
          peerAvatar={callConfig.peerAvatar}
          onClose={() => setCallConfig(null)}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardModal
          isOpen={!!forwardingMessage}
          messageContent={forwardingMessage.content || ''}
          attachmentType={forwardingMessage.attachment_type}
          attachmentLink={forwardingMessage.attachment_link}
          chats={chats}
          currentUserId={currentUserId}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardConfirm}
        />
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-default)', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--neon-cyan)' }}>Edit Message</h3>
            <textarea
              rows={3}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setEditingMessage(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} style={{ padding: '8px 16px', background: 'var(--neon-cyan)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
        onChatCreated={async (chatId) => {
          const updatedChats = await fetchChatsClient();
          setChats(updatedChats as ChatConversation[]);
          const newChat = (updatedChats as ChatConversation[]).find(c => c.id === chatId);
          if (newChat) setActiveChat(newChat);
        }} 
      />
    </div>
  );
}
