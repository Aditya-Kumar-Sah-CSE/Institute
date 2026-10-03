'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import { parseAttachmentUrls } from '@/lib/attachments';
import { deleteNotice } from '@/features/notices/actions';
import { deleteCourseNotice } from '@/features/courses/actions/notices';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';

export interface Notice {
  id: string;
  title: string;
  content: string;
  author_id?: string;
  created_by?: string;
  course_id?: string;
  created_at: string;
  expires_at?: string;
  image_url?: string;
  noticeScope?: string;
  profiles: {
    name: string;
    role: string;
    email?: string;
  };
}

interface NoticeBoardProps {
  notices: Notice[];
  emptyMessage?: string;
  currentUserId?: string;
  currentUserRole?: string;
}

function NoticeAttachments({ urls, onSelectImage }: { urls: string[], onSelectImage: (url: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className="text-neon-cyan text-sm cursor-pointer hover:underline mb-4 inline-flex items-center gap-1 font-medium bg-cyan-900/10 px-3 py-1.5 rounded-full border border-cyan-900/30 transition-colors"
        style={{ cursor: 'pointer' }}
      >
        See more ({urls.length} attachment{urls.length > 1 ? 's' : ''})
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        {urls.map((url, idx) => (
          <div 
            key={idx} 
            style={{ 
              position: 'relative', 
              width: urls.length === 1 ? '200px' : 'clamp(100px, calc(50% - var(--space-sm)), 150px)', 
              height: urls.length === 1 ? '200px' : 'clamp(100px, 120px, 150px)', 
              cursor: 'pointer', 
              borderRadius: 'var(--radius-md)', 
              overflow: 'hidden',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)'
            }} 
            onClick={() => onSelectImage(url)}
          >
            <Image 
              src={url} 
              alt={`Notice attachment ${idx + 1}`} 
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }} 
            />
          </div>
        ))}
      </div>
      <div 
        onClick={() => setIsExpanded(false)}
        className="text-neon-cyan text-sm cursor-pointer hover:underline mb-4 inline-flex items-center gap-1 font-medium bg-cyan-900/10 px-3 py-1.5 rounded-full border border-cyan-900/30 transition-colors"
        style={{ cursor: 'pointer', marginTop: '-8px' }}
      >
        See less
      </div>
    </>
  );
}

function NoticeContentText({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = content ? content.trim().split(/\s+/) : [];
  const isLong = words.length > 25;

  const displayContent = !isLong || isExpanded
    ? content
    : words.slice(0, 25).join(' ') + '...';

  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{displayContent}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            cursor: 'pointer',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--neon-cyan)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            marginTop: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export default function NoticeBoard({ notices, emptyMessage = 'No notices available.', currentUserId, currentUserRole }: NoticeBoardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [noticeList, setNoticeList] = useState<Notice[]>(notices);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(currentUserId);
  const [userRole, setUserRole] = useState<string | undefined>(currentUserRole);
  const initialLimit = 3;

  useEffect(() => {
    setNoticeList(notices);
  }, [notices]);

  useEffect(() => {
    if (currentUserId) setUserId(currentUserId);
    if (currentUserRole) setUserRole(currentUserRole);
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (!userId) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id);
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data: prof }) => {
            if (prof?.role) setUserRole(prof.role);
          });
        }
      });
    }
  }, [userId]);

  const handleDelete = async (notice: Notice) => {
    if (!window.confirm(`Are you sure you want to delete "${notice.title}"?`)) return;
    setDeletingId(notice.id);
    try {
      let result: { success?: boolean; error?: string } = {};
      if (notice.course_id) {
        result = await deleteCourseNotice(notice.course_id, notice.id);
      } else {
        result = await deleteNotice(notice.id);
      }
      if (result.error) {
        alert(result.error);
      } else {
        setNoticeList(prev => prev.filter(n => n.id !== notice.id));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete notice.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!noticeList || noticeList.length === 0) {
    return (
      <Card variant="glass" padding="lg" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-lg)', background: 'rgba(255, 255, 255, 0.01)', border: '1px border-dashed var(--border-default)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)', opacity: 0.8 }}>📢</div>
        <h4 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2xs)' }}>All Caught Up!</h4>
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>
          {emptyMessage === 'No notices available.' ? 'No announcements posted yet. Updates from instructors will appear here.' : emptyMessage}
        </p>
      </Card>
    );
  }

  const displayedNotices = isExpanded ? noticeList : noticeList.slice(0, initialLimit);
  const remainingCount = noticeList.length - initialLimit;

  return (
    <>
      <style>{`
        .notice-board-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          min-width: 0;
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 768px) {
          .notice-board-wrapper {
            max-width: 100%;
          }
        }
      `}</style>
      <div className="notice-board-wrapper">
        {displayedNotices.map((notice) => {
          const isAuthor = Boolean(userId && (notice.author_id === userId || (notice as any).created_by === userId));
          const isAdmin = ['admin', 'super_admin', 'superadmin', 'developer'].includes((userRole || '').toLowerCase());
          const canDelete = isAuthor || isAdmin;

          return (
            <Card key={notice.id} variant="glass" padding="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <h3 style={{ color: 'var(--neon-cyan)', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{notice.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {notice.noticeScope && <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{notice.noticeScope}</span>}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(notice)}
                        disabled={deletingId === notice.id}
                        title="Delete notice"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--neon-red, #ef4444)',
                          cursor: deletingId === notice.id ? 'not-allowed' : 'pointer',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm, 6px)',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease',
                          opacity: deletingId === notice.id ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => { if (deletingId !== notice.id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                        onMouseOut={(e) => { if (deletingId !== notice.id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                      >
                        <Trash2 size={12} />
                        {deletingId === notice.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {new Date(notice.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  {notice.expires_at && (
                    <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-orange)' }}>
                      Expires: {new Date(notice.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <NoticeContentText content={notice.content} />
              {(() => {
                const urls = parseAttachmentUrls(notice.image_url);
                if (urls.length === 0) return null;
                
                return <NoticeAttachments urls={urls} onSelectImage={setSelectedImage} />;
              })()}
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Posted by <strong style={{ color: 'var(--text-primary)' }}>{notice.profiles.name}</strong> 
                <span style={{ 
                  marginLeft: 'var(--space-xs)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: notice.profiles.email === 'iambestadi@gmail.com' ? 'rgba(0, 240, 255, 0.2)' : notice.profiles.role === 'admin' ? 'rgba(233, 69, 96, 0.2)' : 'rgba(15, 52, 96, 0.5)',
                  color: notice.profiles.email === 'iambestadi@gmail.com' ? 'var(--neon-cyan)' : notice.profiles.role === 'admin' ? 'var(--neon-red)' : 'var(--neon-blue)',
                  fontWeight: notice.profiles.email === 'iambestadi@gmail.com' ? 'bold' : 'normal'
                }}>
                  {notice.profiles.email === 'iambestadi@gmail.com' ? 'DEVELOPER' : notice.profiles.role.toUpperCase()}
                </span>
              </div>
            </Card>
          );
        })}

        {remainingCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-xs)' }}>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: 'var(--neon-cyan)',
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.16)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'; }}
            >
              {isExpanded ? 'Show Less Notices' : `See More Notices (${remainingCount} more)`}
            </button>
          </div>
        )}
      </div>

      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: 'var(--space-lg)'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', width: '90vw', height: '90vh' }}>
            <Image 
              src={selectedImage} 
              alt="Preview" 
              fill
              sizes="90vw"
              style={{ objectFit: 'contain', borderRadius: 'var(--radius-md)' }} 
            />
          </div>
          <button 
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)',
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              width: '40px', height: '40px', borderRadius: '50%',
              fontSize: '24px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
