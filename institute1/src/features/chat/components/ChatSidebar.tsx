'use client';

import React from 'react';
import { Plus, Search, User as UserIcon, Users, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/tenant/TenantProvider';
import type { ChatConversation } from '@/types/database';

interface ChatSidebarProps {
  chats: ChatConversation[];
  activeChat: ChatConversation | null;
  setActiveChat: (chat: ChatConversation | null) => void;
  suggestedUsers: any[];
  handleCreateSuggestedChat: (userId: string) => void;
  setIsNewChatModalOpen: (val: boolean) => void;
  getChatAvatar: (chat: ChatConversation) => React.ReactNode;
  getChatName: (chat: ChatConversation) => string;
}

export default function ChatSidebar({
  chats,
  activeChat,
  setActiveChat,
  suggestedUsers,
  handleCreateSuggestedChat,
  setIsNewChatModalOpen,
  getChatAvatar,
  getChatName
}: ChatSidebarProps) {
  const router = useRouter();
  const { baseUrl } = useTenant();

  return (
    <div className="chat-sidebar">
      <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', zIndex: 10 }}>
        <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>Messages</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => router.push(`${baseUrl}/dashboard`)}
            style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            title="Go to Dashboard"
            onMouseOver={e => { e.currentTarget.style.background = 'var(--neon-cyan)'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            <LayoutDashboard size={20} />
          </button>
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,240,255,0.1)' }} 
            title="New Chat"
            onMouseOver={e => { e.currentTarget.style.background = 'var(--neon-cyan)'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      {/* Chat List Search Bar */}
      <div style={{ padding: 'var(--space-md)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            style={{ 
              width: '100%', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-default)', 
              borderRadius: 'var(--radius-md)', 
              padding: '10px 12px 10px 36px', 
              fontSize: 'var(--text-sm)', 
              color: 'var(--text-primary)', 
              outline: 'none', 
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          />
        </div>
      </div>
      
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-sm) var(--space-sm)' }}>
        {chats.length === 0 ? (
          <div style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 'var(--space-xl)' }}>
              No active chats yet. Start a conversation below!
            </p>
            
            {suggestedUsers.length > 0 && (
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontWeight: 'bold', letterSpacing: '0.05em' }}>People you may know</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {suggestedUsers.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleCreateSuggestedChat(user.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-divider)', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-divider)'}
                    >
                       <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {user.avatar_url ? <Image src={user.avatar_url} alt="avatar" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /> : <UserIcon size={18} color="var(--text-muted)" />}
                       </div>
                       <div style={{ flex: 1, minWidth: 0 }}>
                         <h5 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h5>
                         <p style={{ margin: 0, fontSize: '11px', color: 'var(--neon-cyan)', textTransform: 'capitalize' }}>{user.role}</p>
                       </div>
                       <Plus size={16} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          chats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 'var(--space-md)', 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)', 
                  cursor: 'pointer', 
                  background: isActive ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.15) 0%, transparent 100%)' : 'transparent', 
                  borderLeft: isActive ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: isActive ? 'blur(10px)' : 'none'
                }}
                onMouseOver={e => !isActive && (e.currentTarget.style.background = 'var(--bg-elevated)', e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseOut={e => !isActive && (e.currentTarget.style.background = 'transparent', e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  {getChatAvatar(chat)}
                </div>
                <div style={{ flex: 1, minWidth: 0, borderBottom: isActive ? '1px solid transparent' : '1px solid var(--border-divider)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontWeight: 'bold', fontSize: '15px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getChatName(chat)}
                    </h4>
                    <span style={{ fontSize: '11px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                      {new Date(chat.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: isActive ? 1 : 0.8 }}>
                      {chat.type === 'group' ? 'Tap to open group' : 'Tap to chat'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
