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
      minHeight: '64px',
      height: 'auto',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
      paddingBottom: '6px',
      borderBottom: '1px solid var(--border-divider)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '12px',
      paddingRight: '12px',
      justifyContent: 'space-between',
      background: 'var(--bg-secondary)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      boxSizing: 'border-box',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Left Avatar & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <button 
          className="mobile-back-btn" 
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', borderRadius: '50%', flexShrink: 0, marginRight: '2px' }}
          aria-label="Back to chats"
        >
          <ArrowLeft size={18} />
        </button>

        <div 
          onClick={onToggleInfo}
          style={{
            position: 'relative',
            width: '38px',
            height: '38px',
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
              bottom: 1,
              right: 1,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--neon-lime)',
              border: '1.5px solid var(--bg-secondary)',
              boxShadow: '0 0 4px var(--neon-lime)'
            }} />
          )}
        </div>

        <div style={{ minWidth: 0, cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} onClick={onToggleInfo}>
          <h3 style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }}>
            {chatTitle}
          </h3>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        {/* Search */}
        <button 
          onClick={onToggleSearch}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="Search Messages"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Search size={18} />
        </button>

        {/* Video Call */}
        <button 
          onClick={() => onStartCall('video')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="Video Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Video size={18} />
        </button>

        {/* Voice Call */}
        <button 
          onClick={() => onStartCall('audio')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="Voice Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Phone size={18} />
        </button>

        {/* Info Drawer */}
        <button 
          onClick={onToggleInfo}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title="Info & Media"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
