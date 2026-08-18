'use client';

import React, { useState } from 'react';
import { X, Send, Search, Check, Users, User } from 'lucide-react';
import type { ChatConversation } from '@/types/database';
import UserAvatar from '@/components/shared/UserAvatar';

interface ForwardModalProps {
  isOpen: boolean;
  messageContent: string;
  attachmentType?: string | null;
  attachmentLink?: string | null;
  chats: ChatConversation[];
  currentUserId: string | null;
  onClose: () => void;
  onForward: (targetConversationId: string) => Promise<void>;
}

export default function ForwardModal({
  isOpen,
  messageContent,
  attachmentType,
  attachmentLink,
  chats,
  currentUserId,
  onClose,
  onForward
}: ForwardModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const filteredChats = chats.filter(chat => {
    if (!searchTerm.trim()) return true;
    let name = chat.name || '';
    if (chat.type === 'personal') {
      const other = chat.members?.find(m => m.user_id !== currentUserId);
      name = other?.profile?.name || '';
    }
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleConfirmForward = async () => {
    if (!selectedChatId) return;
    setIsSending(true);
    try {
      await onForward(selectedChatId);
      onClose();
    } catch (err: any) {
      alert('Failed to forward message: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(6px)',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        maxWidth: '440px',
        width: '100%',
        color: 'var(--text-primary)',
        boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-divider)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} style={{ color: 'var(--neon-cyan)', transform: 'rotate(-20deg)' }} /> Forward Message
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          borderLeft: '4px solid var(--neon-cyan)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          maxHeight: '60px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {messageContent || (attachmentType ? `[${attachmentType.toUpperCase()} Attachment]` : 'Forwarded message')}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search chat or contact..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Chat List */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="no-scrollbar">
          {filteredChats.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '20px 0' }}>No chats found.</p>
          ) : (
            filteredChats.map(chat => {
              const isSelected = selectedChatId === chat.id;
              let name = chat.name || 'Group';
              let avatar = null;

              if (chat.type === 'personal') {
                const other = chat.members?.find(m => m.user_id !== currentUserId);
                name = other?.profile?.name || 'User';
                avatar = <UserAvatar url={other?.profile?.avatar_url} name={name} size={36} />;
              } else {
                avatar = <Users size={20} color="var(--neon-cyan)" />;
              }

              return (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)',
                    border: isSelected ? '1px solid var(--neon-cyan)' : '1px solid var(--border-divider)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                      {avatar}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                  </div>
                  {isSelected && <Check size={18} style={{ color: 'var(--neon-cyan)' }} />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmForward}
            disabled={!selectedChatId || isSending}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              background: selectedChatId ? 'var(--neon-cyan)' : 'var(--bg-elevated)',
              border: 'none',
              color: selectedChatId ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              cursor: (!selectedChatId || isSending) ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            {isSending ? 'Forwarding...' : 'Send Forward'}
          </button>
        </div>
      </div>
    </div>
  );
}
