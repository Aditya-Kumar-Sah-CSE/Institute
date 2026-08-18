'use client';

import React from 'react';
import { ArrowLeft, Search, Video, Phone, Info } from 'lucide-react';
import type { ChatConversation } from '@/types/database';

interface ChatHeaderProps {
  activeChat: ChatConversation;
  currentUserId: string | null;
  onlineUsers: Set<string>;
  typingUsers: string[];
  onBack: () => void;
  onToggleSearch: () => void;
  onStartCall: (type: 'video' | 'audio') => void;
  onToggleInfo: () => void;
  onOpenParticipantsModal: () => void;
  getChatAvatar: (chat: ChatConversation) => React.ReactNode;
  getChatName: (chat: ChatConversation) => string;
}

export default function ChatHeader({
  activeChat,
  currentUserId,
  onlineUsers,
  typingUsers,
  onBack,
  onToggleSearch,
  onStartCall,
  onToggleInfo,
  onOpenParticipantsModal,
  getChatAvatar,
  getChatName
}: ChatHeaderProps) {
  const isGroup = activeChat.type === 'group';
  const chatTitle = getChatName(activeChat);

  const isSomeoneTyping = typingUsers.length > 0;
  const peer = !isGroup ? activeChat.members?.find(p => p.user_id !== currentUserId) : null;
  const isPeerOnline = peer ? onlineUsers.has(peer.user_id) : false;

  return (
    <div style={{
      height: '64px',
      borderBottom: '1px solid var(--border-divider)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      justifyContent: 'space-between',
      background: 'var(--bg-secondary)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      {/* Left Avatar & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <button 
          className="mobile-back-btn" 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
          aria-label="Back to chats"
        >
          <ArrowLeft size={20} />
        </button>

        <div 
          onClick={onToggleInfo}
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {getChatAvatar(activeChat)}
          {!isGroup && isPeerOnline && (
            <span style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--neon-lime)',
              border: '2px solid var(--bg-secondary)',
              boxShadow: '0 0 6px var(--neon-lime)'
            }} />
          )}
        </div>

        <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={onToggleInfo}>
          <h3 style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chatTitle}
          </h3>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isSomeoneTyping ? (
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>typing...</span>
            ) : isGroup ? (
              null
            ) : (
              <span style={{ color: isPeerOnline ? 'var(--neon-lime)' : 'var(--text-muted)' }}>
                {isPeerOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Header Actions (Search, Video Call, Audio Call, Info) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Search */}
        <button 
          onClick={onToggleSearch}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Search Messages"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Search size={19} />
        </button>

        {/* Video Call */}
        <button 
          onClick={() => onStartCall('video')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Video Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Video size={19} />
        </button>

        {/* Voice Call */}
        <button 
          onClick={() => onStartCall('audio')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Voice Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Phone size={19} />
        </button>

        {/* Info Drawer */}
        <button 
          onClick={onToggleInfo}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Info & Media"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Info size={19} />
        </button>
      </div>
    </div>
  );
}
