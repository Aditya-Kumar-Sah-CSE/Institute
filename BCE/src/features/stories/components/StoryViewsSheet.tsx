'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { X, Eye, User, MessageCircle } from 'lucide-react';
import { fetchStoryViews, fetchStoryReplies } from '@/features/stories/actions/stories';

interface ViewRecord {
  viewer_id: string;
  viewed_at: string;
  profile: { id: string; name: string; avatar_url: string | null } | null;
}

interface ReplyRecord {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  profile: { id: string; name: string; avatar_url: string | null } | null;
}

interface StoryViewsSheetProps {
  storyItemId: string;
  totalViews: number;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'views' | 'replies';

export default function StoryViewsSheet({ storyItemId, totalViews, isOpen, onClose }: StoryViewsSheetProps) {
  const [tab, setTab] = useState<Tab>('views');
  const [views, setViews] = useState<ViewRecord[]>([]);
  const [replies, setReplies] = useState<ReplyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !storyItemId) return;
    setLoading(true);
    Promise.all([
      fetchStoryViews(storyItemId),
      fetchStoryReplies(storyItemId),
    ]).then(([v, r]) => {
      setViews(v as unknown as ViewRecord[]);
      setReplies(r as unknown as ReplyRecord[]);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, storyItemId]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString();
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
            style={{ position: 'fixed', inset: 0, zIndex: 1000000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              maxWidth: '34rem',
              margin: '0 auto',
              height: '65vh',
              borderRadius: '1.5rem 1.5rem 0 0',
              backgroundColor: '#0f172a',
              zIndex: 1000001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem' }}>
              <div style={{ width: '3rem', height: '0.25rem', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem 0' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setTab('views')}
                  style={{
                    fontSize: '0.9rem', fontWeight: 600,
                    color: tab === 'views' ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                    borderBottom: tab === 'views' ? '2px solid #22d3ee' : '2px solid transparent',
                    paddingBottom: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    transition: 'color 0.2s'
                  }}
                >
                  <Eye size={16} /> Views · {views.length || totalViews}
                </button>
                <button
                  onClick={() => setTab('replies')}
                  style={{
                    fontSize: '0.9rem', fontWeight: 600,
                    color: tab === 'replies' ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    borderBottom: tab === 'replies' ? '2px solid #a78bfa' : '2px solid transparent',
                    paddingBottom: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    transition: 'color 0.2s'
                  }}
                >
                  <MessageCircle size={16} /> Replies · {replies.length}
                </button>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '0.5rem 0' }} />

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem 1rem' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
                  <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#22d3ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : tab === 'views' ? (
                views.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', paddingTop: '3rem', fontSize: '0.9rem' }}>
                    No views yet
                  </div>
                ) : (
                  views.map((v) => (
                    <ViewerRow key={v.viewer_id} name={v.profile?.name || 'User'} avatarUrl={v.profile?.avatar_url} profileId={v.profile?.id} time={formatTime(v.viewed_at)} />
                  ))
                )
              ) : (
                replies.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', paddingTop: '3rem', fontSize: '0.9rem' }}>
                    No replies yet
                  </div>
                ) : (
                  replies.map((r) => (
                    <ReplyRow key={r.id} name={r.profile?.name || 'User'} avatarUrl={r.profile?.avatar_url} profileId={r.profile?.id} message={r.message} time={formatTime(r.created_at)} />
                  ))
                )
              )}
            </div>
          </motion.div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}

function ViewerRow({ name, avatarUrl, profileId, time }: { name: string; avatarUrl: string | null | undefined; profileId: string | undefined; time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', borderRadius: '0.75rem' }}>
      <Link href={profileId ? `/users/${profileId}` : '#'} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <User size={20} color="rgba(255,255,255,0.4)" />
          )}
        </div>
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={profileId ? `/users/${profileId}` : '#'} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        </Link>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{time}</p>
      </div>
      <Eye size={14} color="rgba(255,255,255,0.3)" />
    </div>
  );
}

function ReplyRow({ name, avatarUrl, profileId, message, time }: { name: string; avatarUrl: string | null | undefined; profileId: string | undefined; message: string; time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.6rem 0.5rem', borderRadius: '0.75rem' }}>
      <Link href={profileId ? `/users/${profileId}` : '#'} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} fill style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <User size={18} color="rgba(255,255,255,0.4)" />
          )}
        </div>
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={profileId ? `/users/${profileId}` : '#'} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', margin: '0 0 2px 0' }}>{name}</p>
        </Link>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '0 0.75rem 0.75rem 0.75rem', padding: '0.5rem 0.75rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{message}</p>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', margin: '3px 0 0' }}>{time}</p>
      </div>
    </div>
  );
}
