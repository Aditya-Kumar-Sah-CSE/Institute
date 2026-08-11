'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatConversation, ChatMessage } from '@/types/database';
import { Send, User as UserIcon, Users, MoreVertical, Plus, Image as ImageIcon, Smile, X, Loader2, Search, ArrowLeft, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import UserAvatar from '@/components/shared/UserAvatar';
import { Virtuoso } from 'react-virtuoso';
import NewChatModal from './NewChatModal';
import EmptyChatState from './EmptyChatState';
import MessageBubble from './MessageBubble';
import ChatComposer from './ChatComposer';
import ChatSidebar from './ChatSidebar';
import { useRouter } from 'next/navigation';
import './ChatInterface.css';

export default function ChatInterface() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const activeChannelRef = useRef<any>(null);
  const supabase = createClient();

  // Client-side direct fetch to avoid Next.js Server Action caching bugs
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
      .select(`*, sender:profiles!chat_messages_sender_id_fkey(id, name, avatar_url, role)`)
      .eq('conversation_id', conversationId)
      .eq('deleted_for_everyone', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
       console.error("Messages fetch error:", error);
    }
    return (data as ChatMessage[]) || [];
  };

  const sendChatMessageClient = async (conversationId: string, content: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return false;
    
    // Check if inserted message is actually successful
    const { error } = await supabase.from('chat_messages').insert({
       conversation_id: conversationId,
       sender_id: userData.user.id,
       content: content
    });
    if (error) {
       console.error("Failed to insert message:", error);
       return false;
    }
    
    // Also update chat_conversations updated_at
    await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    return true;
  };

  useEffect(() => {
    if (activeChat) {
      fetchMessagesClient(activeChat.id).then(setMessages);
    }
  }, [activeChat]);

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
    console.group("Create Chat: Auto-Suggestion");
    console.log("Request: Attempting to create direct chat with user", userId);
    try {
      const { data, error } = await supabase.rpc('get_or_create_direct_chat', { peer_id: userId });
      if (error) {
        console.error('Response Error:', error);
        console.groupEnd();
        return;
      }
      if (data) {
         console.log("Response: Success! Conversation ID generated:", data);
         // Optimistic Update: Immediately add a placeholder object before the network returns
         const optimisticChat = { id: data, type: 'personal', updated_at: new Date().toISOString(), members: [] } as unknown as ChatConversation;
         setChats(prev => [optimisticChat, ...prev.filter(c => c.id !== data)]);
         setActiveChat(optimisticChat);

         console.log("State Update: Triggering full hydration fetch...");
         const updatedChats = await fetchChatsClient();
         
         const newChat = (updatedChats as ChatConversation[]).find(c => c.id === data);
         if (newChat) {
           console.log("Hydration: Conversation verified. Syncing state...", newChat);
           setChats(updatedChats as ChatConversation[]);
           setActiveChat(newChat);
         } else {
           console.warn("Hydration failed: New chat not found in query results.");
         }
      }
    } catch(e) {
      console.error("Critical Failure:", e);
    }
    console.groupEnd();
  };

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

  // Real-time subscription placeholder for messages
  useEffect(() => {
    if (!activeChat || !currentUserId) return;

    if (activeChannelRef.current) {
       supabase.removeChannel(activeChannelRef.current);
    }

    const channel = supabase
      .channel(`chat_${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeChat.id}` }, (payload: any) => {
        if (payload.new.sender_id !== currentUserId) {
          fetchMessagesClient(activeChat.id).then(setMessages);
        }
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
          await channel.track({ user_id: currentUserId, typing: isTyping });
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

  useEffect(() => {
    // We update presence when typing state changes
    if (!activeChat || !currentUserId || !activeChannelRef.current) return;
    activeChannelRef.current.track({ user_id: currentUserId, typing: msgInput.trim().length > 0 });
  }, [msgInput]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChat) return;

    const tempMsg = msgInput;
    setMsgInput('');
    
    // Add optimistic message
    const optimisticId = Date.now().toString();
    if (currentUserId) {
      const optimisticMessage = {
      id: optimisticId,
      conversation_id: activeChat.id,
      sender_id: currentUserId || '',
      content: tempMsg,
      attachment_type: null,
      attachment_link: null,
      reply_to_id: null,
      is_edited: false,
      is_pinned: false,
      deleted_for_everyone: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: undefined
    } as unknown as ChatMessage;

    setMessages(prev => [...prev, optimisticMessage]);
    }

    try {
      const success = await sendChatMessageClient(activeChat.id, tempMsg);
      if (!success) {
         setMessages(prev => prev.filter(m => m.id !== optimisticId));
      }
    } catch(err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }
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
      />

      {/* Main Chat Window */}
      <div className="chat-main">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div style={{ height: '64px', borderBottom: '1px solid var(--border-divider)', display: 'flex', alignItems: 'center', padding: '0 var(--space-lg)', justifyContent: 'space-between', background: 'var(--bg-secondary)', zIndex: 10 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                 <button className="mobile-back-btn" onClick={() => setActiveChat(null)}>
                   <ArrowLeft size={20} />
                 </button>
                 <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                    {getChatAvatar(activeChat)}
                 </div>
                 <div>
                    <h3 style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '15px' }}>{getChatName(activeChat)}</h3>
                    {(() => {
                       if (activeChat.type === 'group') {
                         return <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{activeChat.members?.length || 0} participants</p>;
                       }
                       const peer = activeChat.members?.find(p => p.user_id !== currentUserId);
                       const isOnline = peer ? onlineUsers.has(peer.user_id) : false;
                       return (
                         <p style={{ margin: 0, fontSize: '12px', color: isOnline ? 'var(--neon-lime)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                           <style>{`
                             @keyframes neon-pulse-dot {
                               0% { box-shadow: 0 0 8px var(--neon-lime); }
                               50% { box-shadow: 0 0 16px var(--neon-lime); }
                               100% { box-shadow: 0 0 8px var(--neon-lime); }
                             }
                           `}</style>
                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--neon-lime)' : 'var(--text-muted)', animation: isOnline ? 'neon-pulse-dot 2s infinite' : 'none' }}></span>
                           {isOnline ? 'Online' : 'Offline'}
                         </p>
                       );
                    })()}
                 </div>
               </div>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--neon-cyan)', padding: '8px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Go to Dashboard"
                >
                  <LayoutDashboard size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: 'var(--space-lg)', position: 'relative', overflowY: 'auto' }}>
               {messages.length === 0 ? (
                 <EmptyChatState onQuickReply={(text) => setMsgInput(text)} />
               ) : (
                 <div style={{ position: 'absolute', inset: 0, padding: 'var(--space-md)' }}>
                   <Virtuoso
                     data={messages}
                     followOutput="smooth"
                     alignToBottom={true}
                     initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
                     style={{ height: '100%' }}
                     itemContent={(index, msg) => (
                       <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === currentUserId} />
                     )}
                   />
                 </div>
               )}
            </div>

            {/* Input target */}
            <ChatComposer 
              msgInput={msgInput} 
              setMsgInput={setMsgInput} 
              handleSend={handleSend} 
              isSomeoneTyping={typingUsers.length > 0} 
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

      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
        onChatCreated={async (chatId) => {
          console.group("Create Chat: Modal Generation");
          console.log("Modal Hand-off: Received Conversation ID from backend:", chatId);
          
          // Optimistic injection
          const optimisticChat = { id: chatId, type: 'personal', updated_at: new Date().toISOString(), members: [] } as unknown as ChatConversation;
          setChats(prev => [optimisticChat, ...prev.filter(c => c.id !== chatId)]);
          setActiveChat(optimisticChat);

          const updatedChats = await fetchChatsClient();
          const newChat = (updatedChats as ChatConversation[]).find(c => c.id === chatId);
          if (newChat) {
             console.log("Client Update: Refresh matched freshly created row.");
             setChats(updatedChats as ChatConversation[]);
             setActiveChat(newChat);
          } else {
             console.warn("Missing Row: Database successfully responded but client fetch returned empty array.", updatedChats);
          }
          console.groupEnd();
        }} 
      />
    </div>
  );
}
