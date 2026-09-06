'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import type { StoryReply } from '@/types/database';
import { fetchStoryReplies } from '@/features/stories/actions/stories';

interface StoryRepliesSheetProps {
  storyItemId: string;
  storyOwnerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSendReply?: (message: string) => Promise<void>;
}

export default function StoryRepliesSheet({
  storyItemId,
  storyOwnerName,
  isOpen,
  onClose,
  onSendReply
}: StoryRepliesSheetProps) {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReplies([]);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadReplies = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStoryReplies(storyItemId);
        if (isMounted) {
          setReplies(data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load replies:', err);
          setError(err instanceof Error ? err.message : 'Failed to load replies');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReplies();

    return () => {
      isMounted = false;
    };
  }, [isOpen, storyItemId]);

  const handleSendReply = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      if (onSendReply) {
        await onSendReply(newMessage);
      }
      setNewMessage('');
      // Reload replies after sending
      const data = await fetchStoryReplies(storyItemId);
      setReplies(data || []);
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000000
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000001,
              backgroundColor: '#0f172a',
              borderRadius: '1.5rem 1.5rem 0 0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MessageCircle size={20} style={{ color: '#22d3ee' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                    {storyOwnerName ? `Replies to ${storyOwnerName}'s Status` : 'Status Replies'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className="hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Replies List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {error && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#f43f5e',
                    fontSize: '0.875rem'
                  }}
                >
                  {error}
                </div>
              )}
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}
                >
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : replies.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center'
                  }}
                >
                  <MessageCircle size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <p>No replies yet. Be the first to respond!</p>
                </div>
              ) : (
                replies.map((reply) => (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#1e293b',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <Image
                        src={reply.sender?.avatar_url || `https://ui-avatars.com/api/?name=${reply.sender?.name}&background=0D8ABC&color=fff`}
                        alt={reply.sender?.name || 'User'}
                        width={40}
                        height={40}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        unoptimized
                      />
                    </div>

                    {/* Message Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                          {reply.sender?.name || 'Anonymous'}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.8)',
                          wordBreak: 'break-word'
                        }}
                      >
                        {reply.message}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Reply Input */}
            <div
              style={{
                padding: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                flexShrink: 0
              }}
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Reply to this status..."
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
              <button
                onClick={handleSendReply}
                disabled={!newMessage.trim() || sending}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#22d3ee',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  opacity: sending || !newMessage.trim() ? 0.5 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
