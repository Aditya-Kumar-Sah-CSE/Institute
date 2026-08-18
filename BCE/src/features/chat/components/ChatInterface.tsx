'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatConversation, ChatMessage } from '@/types/database';
import { Send, User as UserIcon, Users, ChevronDown } from 'lucide-react';
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
import CallModal, { CallState } from './CallModal';
import ForwardModal from './ForwardModal';
import DateSeparator from './DateSeparator';
import { 
  editChatMessage, deleteChatMessage, togglePinChatMessage, toggleMessageReaction 
} from '@/features/chat/actions/chat';
import { useRouter } from 'next/navigation';
import './ChatInterface.css';

interface CallSession {
  callId: string;
  type: 'video' | 'audio';
  isIncoming: boolean;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  conversationId: string;
  callState: CallState;
  offer?: RTCSessionDescriptionInit;
}

export default function ChatInterface() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  // Search & Drawer
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  // Message Actions
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // WebRTC Audio/Video Call System State
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const virtuosoRef = useRef<any>(null);
  const activeChannelRef = useRef<any>(null);
  const peerSignalChannelRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioToneRef = useRef<{ stop: () => void } | null>(null);
  const supabase = createClient();

  // Web Audio synth ringtone helper
  const playTone = (kind: 'dialing' | 'ringing') => {
    try {
      if (audioToneRef.current) audioToneRef.current.stop();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'dialing' ? 440 : 880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      
      const interval = setInterval(() => {
        if (gain) {
          gain.gain.setValueAtTime(gain.gain.value > 0 ? 0 : 0.08, audioCtx.currentTime);
        }
      }, 1000);

      audioToneRef.current = {
        stop: () => {
          try {
            clearInterval(interval);
            osc.stop();
            audioCtx.close();
          } catch (e) {}
        }
      };
    } catch (e) {
      audioToneRef.current = null;
    }
  };

  const stopTone = () => {
    if (audioToneRef.current) {
      audioToneRef.current.stop();
      audioToneRef.current = null;
    }
  };

  // Fetch user chats & profile
  const fetchChatsClient = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];
    
    // Get profile
    const { data: prof } = await supabase.from('profiles').select('name, avatar_url').eq('id', userData.user.id).single();
    if (prof) setCurrentUserProfile(prof);

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

    if (error) console.error("Messages fetch error:", error);
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

  // Personal WebRTC Signaling Listener Channel
  useEffect(() => {
    if (!currentUserId) return;

    const signalChannel = supabase.channel(`call_signaling_${currentUserId}`);

    signalChannel
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        // Handle incoming call offer
        if (callSession) {
          // Reject as busy if already in call
          signalChannel.send({
            type: 'broadcast',
            event: 'call-reject',
            payload: { callId: payload.callId, callerId: payload.callerId, reason: 'busy' }
          });
          return;
        }

        setCallSession({
          callId: payload.callId,
          type: payload.callType,
          isIncoming: true,
          peerId: payload.callerId,
          peerName: payload.callerName,
          peerAvatar: payload.callerAvatar,
          conversationId: payload.conversationId,
          callState: 'ringing',
          offer: payload.offer
        });
        playTone('ringing');
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
        if (peerConnectionRef.current && payload.answer) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            setCallSession(prev => prev ? { ...prev, callState: 'connected' } : null);
            stopTone();
          } catch (e) {
            console.error('Remote description error:', e);
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (peerConnectionRef.current && payload.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('ICE candidate error:', e);
          }
        }
      })
      .on('broadcast', { event: 'call-reject' }, ({ payload }) => {
        stopTone();
        setCallSession(prev => prev ? { ...prev, callState: payload.reason === 'busy' ? 'failed' : 'rejected' } : null);
        setTimeout(() => cleanupCall(), 1500);
      })
      .on('broadcast', { event: 'call-end' }, () => {
        stopTone();
        setCallSession(prev => prev ? { ...prev, callState: 'ended' } : null);
        setTimeout(() => cleanupCall(), 1000);
      })
      .subscribe();

    peerSignalChannelRef.current = signalChannel;

    return () => {
      supabase.removeChannel(signalChannel);
    };
  }, [currentUserId, callSession]);

  // Clean WebRTC PeerConnection and media tracks
  const cleanupCall = () => {
    stopTone();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallSession(null);
    setPermissionError(null);
  };

  // Initialize WebRTC PeerConnection
  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && peerSignalChannelRef.current) {
        supabase.channel(`call_signaling_${peerId}`).send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate, senderId: currentUserId }
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Start Outbound WebRTC Call
  const handleStartCall = async (type: 'video' | 'audio') => {
    if (!activeChat || !currentUserId) return;
    const isGroup = activeChat.type === 'group';
    if (isGroup) {
      alert('1-to-1 audio and video calls are currently supported for direct messaging.');
      return;
    }

    const peer = activeChat.members?.find(p => p.user_id !== currentUserId);
    if (!peer) return;

    const newCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const peerName = peer.profile?.name || 'User';
    const peerAvatar = peer.profile?.avatar_url;

    setCallSession({
      callId: newCallId,
      type,
      isIncoming: false,
      peerId: peer.user_id,
      peerName,
      peerAvatar,
      conversationId: activeChat.id,
      callState: 'calling'
    });
    playTone('dialing');

    try {
      // Request User Media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Create WebRTC PeerConnection
      const pc = createPeerConnection(peer.user_id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send Signal Offer
      supabase.channel(`call_signaling_${peer.user_id}`).send({
        type: 'broadcast',
        event: 'call-offer',
        payload: {
          callId: newCallId,
          conversationId: activeChat.id,
          callerId: currentUserId,
          callerName: currentUserProfile?.name || 'User',
          callerAvatar: currentUserProfile?.avatar_url || null,
          callType: type,
          offer
        }
      });
    } catch (err: any) {
      console.error('Media permission error:', err);
      stopTone();
      setPermissionError(err.name === 'NotAllowedError' ? 'Microphone or camera permission denied by browser.' : 'Media device not available.');
      setCallSession(prev => prev ? { ...prev, callState: 'failed' } : null);
      setTimeout(() => cleanupCall(), 3000);
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    if (!callSession || !callSession.offer) return;
    stopTone();

    setCallSession(prev => prev ? { ...prev, callState: 'connecting' } : null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callSession.type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = createPeerConnection(callSession.peerId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callSession.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Signal Answer
      supabase.channel(`call_signaling_${callSession.peerId}`).send({
        type: 'broadcast',
        event: 'call-answer',
        payload: {
          callId: callSession.callId,
          conversationId: callSession.conversationId,
          answer
        }
      });

      setCallSession(prev => prev ? { ...prev, callState: 'connected' } : null);
    } catch (err: any) {
      console.error('Accept call error:', err);
      setPermissionError(err.name === 'NotAllowedError' ? 'Permission denied.' : 'Device error.');
      setCallSession(prev => prev ? { ...prev, callState: 'failed' } : null);
      setTimeout(() => cleanupCall(), 3000);
    }
  };

  // Reject Incoming Call
  const handleRejectCall = () => {
    if (!callSession) return;
    stopTone();
    supabase.channel(`call_signaling_${callSession.peerId}`).send({
      type: 'broadcast',
      event: 'call-reject',
      payload: { callId: callSession.callId, reason: 'rejected' }
    });
    cleanupCall();
  };

  // Hangup / End Active Call
  const handleEndCall = () => {
    if (!callSession) return;
    stopTone();
    supabase.channel(`call_signaling_${callSession.peerId}`).send({
      type: 'broadcast',
      event: 'call-end',
      payload: { callId: callSession.callId }
    });
    cleanupCall();
  };

  // Toggle Mic
  const handleToggleMic = (isMuted: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  };

  // Toggle Camera
  const handleToggleCamera = (isOff: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isOff;
      });
    }
  };

  // Switch Front/Back Camera (Mobile Device Support)
  const handleSwitchCamera = async () => {
    if (!localStream || !callSession || callSession.type !== 'video') return;
    const currentVideoTrack = localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return;

    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      currentVideoTrack.stop();
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newVideoTrack);
      }

      localStream.removeTrack(currentVideoTrack);
      localStream.addTrack(newVideoTrack);
    } catch (e) {
      console.error('Switch camera failed:', e);
    }
  };

  // Message Send Action
  const handleSend = async (content: string, attachmentType?: string, attachmentLink?: string) => {
    if (!activeChat || !currentUserId) return;

    const replyId = replyToMessage?.id;
    setReplyToMessage(null);

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
      reply_to: (replyToMessage as any) || undefined
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

  const handleReact = async (msgId: string, emoji: string) => {
    if (!currentUserId) return;

    // Optimistically toggle reaction in local state immediately
    setMessages(prevMsgs => prevMsgs.map(m => {
      if (m.id !== msgId) return m;

      const currentReactions = (m as any).reactions || [];
      const hasReaction = currentReactions.some((r: any) => r.user_id === currentUserId && r.emoji === emoji);

      let updatedReactions;
      if (hasReaction) {
        updatedReactions = currentReactions.filter((r: any) => !(r.user_id === currentUserId && r.emoji === emoji));
      } else {
        updatedReactions = [...currentReactions, { message_id: msgId, user_id: currentUserId, emoji }];
      }

      return { ...m, reactions: updatedReactions };
    }));

    try {
      await toggleMessageReaction(msgId, emoji);
      if (activeChat) fetchMessagesClient(activeChat.id).then(setMessages);
    } catch (err) {
      console.error('Toggle reaction error:', err);
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
        handleCreateSuggestedChat={async (userId) => {
          const { data } = await supabase.rpc('get_or_create_direct_chat', { peer_id: userId });
          if (data) {
            const updatedChats = await fetchChatsClient();
            setChats(updatedChats as ChatConversation[]);
            const newChat = (updatedChats as ChatConversation[]).find(c => c.id === data);
            if (newChat) setActiveChat(newChat);
          }
        }}
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
            {/* Clean Header without Grid Icon */}
            <ChatHeader 
              activeChat={activeChat}
              currentUserId={currentUserId}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
              onBack={() => setActiveChat(null)}
              onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
              onStartCall={handleStartCall}
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
                       const isGroup = activeChat.type === 'group';

                       return (
                         <MessageBubble 
                           key={msg.id} 
                           msg={msg} 
                           isMine={isMine} 
                           isRead={false} 
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
                     justifyContent: 'center',
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

      {/* Real WebRTC Audio & Video Call Interface Modal */}
      {callSession && currentUserId && (
        <CallModal
          callId={callSession.callId}
          type={callSession.type}
          isIncoming={callSession.isIncoming}
          peerName={callSession.peerName}
          peerAvatar={callSession.peerAvatar}
          peerId={callSession.peerId}
          currentUserId={currentUserId}
          conversationId={callSession.conversationId}
          callState={callSession.callState}
          localStream={localStream}
          remoteStream={remoteStream}
          permissionError={permissionError}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEndCall={handleEndCall}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onSwitchCamera={handleSwitchCamera}
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
