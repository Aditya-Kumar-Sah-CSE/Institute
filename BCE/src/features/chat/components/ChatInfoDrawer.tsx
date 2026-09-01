import React, { useState, useRef } from 'react';
import { X, Users, Image as ImageIcon, FileText, Pin, Bell, BellOff, Trash2, ExternalLink, Shield, Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import UserAvatar from '@/components/shared/UserAvatar';
import type { ChatConversation, ChatMessage } from '@/types/database';
import { uploadGroupAvatarAction } from '@/features/chat/actions/chat';

interface ChatInfoDrawerProps {
  isOpen: boolean;
  activeChat: ChatConversation;
  messages: ChatMessage[];
  currentUserId: string | null;
  onlineUsers: Set<string>;
  onClose: () => void;
  onSelectMedia: (url: string, type: string) => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onBlockUser?: () => void;
  isBlockedByMe?: boolean;
  onUpdateGroupAvatar?: (newIconUrl: string) => void;
}

export default function ChatInfoDrawer({
  isOpen,
  activeChat,
  messages,
  currentUserId,
  onlineUsers,
  onClose,
  onSelectMedia,
  onClearChat,
  onDeleteChat,
  onBlockUser,
  isBlockedByMe,
  onUpdateGroupAvatar
}: ChatInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'docs' | 'pins'>('info');
  const [isMuted, setIsMuted] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isGroup = activeChat.type === 'group';
  const otherMember = !isGroup ? activeChat.members?.find(m => m.user_id !== currentUserId) : null;
  const titleName = isGroup ? (activeChat.name || 'Group Chat') : (otherMember?.profile?.name || 'User');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isGroup) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setAvatarError(null);
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadGroupAvatarAction(formData, activeChat.id);
      if (res.error) throw new Error(res.error);
      if (res.publicUrl) {
        onUpdateGroupAvatar?.(res.publicUrl);
      }
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to update group avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter media, docs, pinned
  const mediaMessages = messages.filter(m => m.attachment_type === 'image' || m.attachment_type === 'video');
  const docMessages = messages.filter(m => m.attachment_type === 'pdf' || m.attachment_type === 'text' || (m.attachment_type && !['image', 'video', 'audio'].includes(m.attachment_type)));
  const pinnedMessages = messages.filter(m => m.is_pinned);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 'min(100vw, 360px)',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-divider)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      color: 'var(--text-primary)'
    }}>
      {/* Hidden file input */}
      {isGroup && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/png, image/jpeg, image/webp"
          style={{ display: 'none' }}
        />
      )}

      {/* Drawer Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
          {isGroup ? 'Group Info' : 'Contact Info'}
        </h3>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Hero Profile Info */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid var(--border-divider)', background: 'rgba(0,0,0,0.1)' }}>
        <div
          onClick={() => isGroup && !isUploadingAvatar && fileInputRef.current?.click()}
          style={{
            position: 'relative',
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid var(--neon-cyan)',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(0,240,255,0.2)',
            cursor: isGroup ? 'pointer' : 'default',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isGroup ? "Click to change group avatar" : undefined}
        >
          {isUploadingAvatar ? (
            <Loader2 className="animate-spin" size={30} color="var(--neon-cyan)" />
          ) : isGroup ? (
            activeChat.icon_url ? (
              <UserAvatar url={activeChat.icon_url} name={titleName} size={80} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)' }}>
                <Users size={36} color="var(--neon-cyan)" />
              </div>
            )
          ) : (
            <UserAvatar url={otherMember?.profile?.avatar_url} name={titleName} size={80} />
          )}

          {isGroup && !isUploadingAvatar && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '1'}
            onMouseOut={e => e.currentTarget.style.opacity = '0'}
            >
              <Camera size={22} color="#fff" />
            </div>
          )}
        </div>
        {avatarError && <p style={{ color: '#ef4444', fontSize: '11px', margin: '0 0 8px 0' }}>{avatarError}</p>}
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{titleName}</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {isGroup ? `${activeChat.members?.length || 0} Members` : (otherMember && onlineUsers.has(otherMember.user_id) ? '🟢 Online' : 'Offline')}
        </p>
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-divider)', background: 'var(--bg-card)' }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            flex: 1,
            padding: '12px 4px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'info' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'info' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          {isGroup ? 'Members' : 'About'}
        </button>
        <button
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '12px 4px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'media' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'media' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          Media ({mediaMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          style={{
            flex: 1,
            padding: '12px 4px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'docs' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'docs' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          Files ({docMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('pins')}
          style={{
            flex: 1,
            padding: '12px 4px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pins' ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            color: activeTab === 'pins' ? 'var(--neon-cyan)' : 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          Pins ({pinnedMessages.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="no-scrollbar">
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isGroup ? (
              <div>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Participants</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeChat.members?.map(member => (
                    <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: 32, height: 32, borderRadius: '50%', overflow: 'hidden' }}>
                          <UserAvatar url={member.profile?.avatar_url} name={member.profile?.name} size={32} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.profile?.name || 'Member'}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {onlineUsers.has(member.user_id) ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                      {member.role === 'owner' || member.role === 'admin' ? (
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(219,39,119,0.15)', color: 'var(--neon-pink)', fontWeight: 700 }}>
                          {member.role.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-divider)', marginBottom: '12px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Role</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'capitalize' }}>
                    {otherMember?.profile?.role || 'Student'}
                  </span>
                </div>
                {otherMember?.profile?.level && (
                  <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-divider)' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Gamification Rank</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-gold)' }}>
                      Level {otherMember.profile.level}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* General Actions */}
            <div style={{ borderTop: '1px solid var(--border-divider)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-divider)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {isMuted ? <BellOff size={16} color="#ff3b30" /> : <Bell size={16} color="var(--neon-cyan)" />}
                {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>

              {onClearChat && (
                <button
                  onClick={onClearChat}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-divider)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  <Trash2 size={16} /> Clear Chat
                </button>
              )}
              {onDeleteChat && (
                <button
                  onClick={onDeleteChat}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,59,48,0.1)',
                    border: '1px solid rgba(255,59,48,0.3)',
                    color: '#ff3b30',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <Trash2 size={16} /> Delete Chat
                </button>
              )}
              {!isGroup && onBlockUser && (
                <button
                  onClick={onBlockUser}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isBlockedByMe ? 'var(--bg-elevated)' : 'rgba(255,59,48,0.1)',
                    border: isBlockedByMe ? '1px solid var(--border-divider)' : '1px solid rgba(255,59,48,0.3)',
                    color: isBlockedByMe ? 'var(--text-primary)' : '#ff3b30',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <Shield size={16} /> {isBlockedByMe ? 'Unblock User' : 'Block User'}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div>
            {mediaMessages.length === 0 ? (
              <p style={{ textTransform: 'capitalize', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '30px 0' }}>No shared images or videos.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {mediaMessages.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => msg.attachment_link && onSelectMedia(msg.attachment_link, msg.attachment_type || 'image')}
                    style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                  >
                    {msg.attachment_type === 'video' ? (
                      <video src={msg.attachment_link || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={msg.attachment_link || ''} alt="Media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div>
            {docMessages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '30px 0' }}>No shared documents.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docMessages.map(msg => (
                  <a
                    key={msg.id}
                    href={msg.attachment_link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-divider)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <FileText size={20} color="var(--neon-cyan)" />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.content || 'Attached File'}
                    </div>
                    <ExternalLink size={14} color="var(--text-muted)" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pins' && (
          <div>
            {pinnedMessages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '30px 0' }}>No pinned messages.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pinnedMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      borderLeft: '3px solid var(--neon-gold)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--neon-gold)', fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Pin size={12} /> Pinned Message
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary)' }}>{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
