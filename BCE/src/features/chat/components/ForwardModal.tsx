'use client';

import React, { useState } from 'react';
import { X, Send, Search, Check, Users, User, CheckSquare, Square } from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/types/database';
import UserAvatar from '@/components/shared/UserAvatar';

interface ForwardModalProps {
  isOpen: boolean;
  messagesToForward?: ChatMessage[];
  messageContent?: string;
  attachmentType?: string | null;
  attachmentLink?: string | null;
  chats: ChatConversation[];
  currentUserId: string | null;
  onClose: () => void;
  onForward: (targetConversationIds: string[], messages: ChatMessage[]) => Promise<void>;
}

export default function ForwardModal({
  isOpen,
  messagesToForward = [],
  messageContent = '',
  attachmentType = null,
  attachmentLink = null,
  chats,
  currentUserId,
  onClose,
  onForward
}: ForwardModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  // Normalize effective messages to forward
  const effectiveMessages: ChatMessage[] = messagesToForward.length > 0 
    ? messagesToForward 
    : [{
        id: 'single_temp',
        conversation_id: '',
        sender_id: currentUserId || '',
        content: messageContent,
        attachment_type: attachmentType as any,
        attachment_link: attachmentLink,
        reply_to_id: null,
        is_edited: false,
        is_pinned: false,
        deleted_for_everyone: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];

  const filteredChats = chats.filter(chat => {
    if (!searchTerm.trim()) return true;
    let name = chat.name || '';
    if (chat.type === 'personal') {
      const other = chat.members?.find(m => m.user_id !== currentUserId);
      name = other?.profile?.name || '';
    }
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleChatSelection = (chatId: string) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedChatIds.length === filteredChats.length) {
      setSelectedChatIds([]);
    } else {
      setSelectedChatIds(filteredChats.map(c => c.id));
    }
  };

  const handleConfirmForward = async () => {
    if (selectedChatIds.length === 0) return;
    setIsSending(true);
    try {
      await onForward(selectedChatIds, effectiveMessages);
      onClose();
    } catch (err: any) {
      alert('Failed to forward message(s): ' + err.message);
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
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(6px)',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        maxWidth: '460px',
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
            <Send size={18} style={{ color: 'var(--neon-cyan)', transform: 'rotate(-20deg)' }} /> Forward Message{effectiveMessages.length > 1 ? 's' : ''}
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
          maxHeight: '70px',
          overflowY: 'auto'
        }}>
          {effectiveMessages.length > 1 ? (
            <span style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>
              Forwarding {effectiveMessages.length} selected messages
            </span>
          ) : (
            effectiveMessages[0]?.content || (effectiveMessages[0]?.attachment_type ? `[${effectiveMessages[0].attachment_type.toUpperCase()} Attachment]` : 'Forwarded message')
          )}
        </div>

        {/* Search & Select All Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search chats or contacts..." 
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
          {filteredChats.length > 0 && (
            <button
              onClick={handleSelectAllFiltered}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--neon-cyan)',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: 600
              }}
            >
              {selectedChatIds.length === filteredChats.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Chat Selection List */}
        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="no-scrollbar">
          {filteredChats.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '20px 0' }}>No chats found.</p>
          ) : (
            filteredChats.map(chat => {
              const isSelected = selectedChatIds.includes(chat.id);
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
                  onClick={() => toggleChatSelection(chat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                  {isSelected ? (
                    <CheckSquare size={18} style={{ color: 'var(--neon-cyan)' }} />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {selectedChatIds.length} chat{selectedChatIds.length !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
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
              disabled={selectedChatIds.length === 0 || isSending}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                background: selectedChatIds.length > 0 ? 'var(--neon-cyan)' : 'var(--bg-elevated)',
                border: 'none',
                color: selectedChatIds.length > 0 ? '#000' : 'var(--text-muted)',
                fontWeight: 700,
                cursor: (selectedChatIds.length === 0 || isSending) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {isSending ? 'Forwarding...' : `Forward (${selectedChatIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
