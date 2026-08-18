'use client';

import React from 'react';
import { ArrowLeft, Search, Video, Phone, Info, LayoutDashboard, Users, User as UserIcon } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      padding: '0 var(--space-md)',
      justify: 'space-between',
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
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4 }}
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
            justify: 'center',
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
              <span 
                onClick={(e) => { e.stopPropagation(); onOpenParticipantsModal(); }} 
                style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-secondary)' }}
              >
                {activeChat.members?.length || 0} participants
              </span>
            ) : (
              <span style={{ color: isPeerOnline ? 'var(--neon-lime)' : 'var(--text-muted)' }}>
                {isPeerOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Search */}
        <button 
          onClick={onToggleSearch}
          style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Search Messages"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Search size={19} />
        </button>

        {/* Video Call */}
        <button 
          onClick={() => onStartCall('video')}
          style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Video Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Video size={19} />
        </button>

        {/* Voice Call */}
        <button 
          onClick={() => onStartCall('audio')}
          style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Voice Call"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Phone size={19} />
        </button>

        {/* Info Drawer */}
        <button 
          onClick={onToggleInfo}
          style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
          title="Info & Media"
          onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-primary)'}
        >
          <Info size={19} />
        </button>

        {/* Dashboard Shortcut */}
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--neon-cyan)', cursor: 'pointer', marginLeft: '4px' }}
          title="Go to Dashboard"
        >
          <LayoutDashboard size={17} />
        </button>
      </div>
    </div>
  );
}
