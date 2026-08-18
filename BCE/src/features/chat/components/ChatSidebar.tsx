'use client';

import React, { useState } from 'react';
import { Plus, Search, User as UserIcon, Users, LayoutDashboard, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ChatConversation } from '@/types/database';
import UserAvatar from '@/components/shared/UserAvatar';

interface ChatSidebarProps {
  chats: ChatConversation[];
  activeChat: ChatConversation | null;
  setActiveChat: (chat: ChatConversation | null) => void;
  suggestedUsers: any[];
  handleCreateSuggestedChat: (userId: string) => void;
  setIsNewChatModalOpen: (val: boolean) => void;
  getChatAvatar: (chat: ChatConversation) => React.ReactNode;
  getChatName: (chat: ChatConversation) => string;
  onlineUsers?: Set<string>;
  currentUserId?: string | null;
}

export default function ChatSidebar({
  chats,
  activeChat,
  setActiveChat,
  suggestedUsers,
  handleCreateSuggestedChat,
  setIsNewChatModalOpen,
  getChatAvatar,
  getChatName,
  onlineUsers = new Set(),
  currentUserId
}: ChatSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups'>('all');

  const filteredChats = chats.filter(chat => {
    const name = getChatName(chat).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    if (activeTab === 'direct') return matchesSearch && chat.type === 'personal';
    if (activeTab === 'groups') return matchesSearch && chat.type === 'group';
    return matchesSearch;
  });

  return (
    <div className="chat-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-divider)' }}>
      {/* Header Bar */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-divider)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-card)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={22} style={{ color: 'var(--neon-cyan)' }} />
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>Messages</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,240,255,0.3)'
            }} 
            title="New Chat"
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>
      
      {/* Search Input */}
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-default)', 
              borderRadius: '20px', 
              padding: '8px 12px 8px 36px', 
              fontSize: '13px', 
              color: 'var(--text-primary)', 
              outline: 'none', 
              boxSizing: 'border-box',
              transition: 'all 0.2s'
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'all' ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)',
              color: activeTab === 'all' ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'direct' ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)',
              color: activeTab === 'direct' ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            Direct
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'groups' ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)',
              color: activeTab === 'groups' ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            Groups
          </button>
        </div>
      </div>
      
      {/* Chat List Scrollable Area */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px 8px' }}>
        {filteredChats.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              No chats found.
            </p>
            
            {suggestedUsers.length > 0 && (
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  Suggested Contacts
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestedUsers.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleCreateSuggestedChat(user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid var(--border-divider)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-default)' }}>
                        <UserAvatar url={user.avatar_url} name={user.name} size={36} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h5>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--neon-cyan)', textTransform: 'capitalize' }}>{user.role}</p>
                      </div>
                      <Plus size={16} color="var(--neon-cyan)" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          filteredChats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            const peer = chat.type === 'personal' ? chat.members?.find(m => m.user_id !== currentUserId) : null;
            const isPeerOnline = peer ? onlineUsers.has(peer.user_id) : false;

            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  borderRadius: '14px', 
                  cursor: 'pointer', 
                  background: isActive ? 'rgba(0, 240, 255, 0.12)' : 'transparent', 
                  borderLeft: isActive ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ position: 'relative', width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  {getChatAvatar(chat)}
                  {chat.type === 'personal' && isPeerOnline && (
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: 'var(--neon-lime)',
                      border: '2px solid var(--bg-secondary)',
                      boxShadow: '0 0 6px var(--neon-lime)'
                    }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '14px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getChatName(chat)}
                    </h4>
                    <span style={{ fontSize: '10px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(chat.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: isActive ? 1 : 0.8 }}>
                      {chat.type === 'group' ? `${chat.members?.length || 0} members` : isPeerOnline ? 'Online' : 'Click to chat'}
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
