'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import { createNotice, deleteNotice } from '../actions';
import type { Notice } from './NoticeBoard';
import { parseAttachmentUrls } from '@/lib/attachments';

interface NoticeManagerProps {
  notices: Notice[];
  currentUserId: string;
  currentUserRole: string;
}

function NoticeContentText({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = content ? content.trim().split(/\s+/) : [];
  const isLong = words.length > 25;

  const displayContent = !isLong || isExpanded
    ? content
    : words.slice(0, 25).join(' ') + '...';

  return (
    <div style={{ marginBottom: 'var(--space-xs)' }}>
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
            marginTop: '6px',
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

export default function NoticeManager({ notices, currentUserId, currentUserRole }: NoticeManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    const result = await createNotice(formData);
    if (result.error) {
      setError(result.error);
    } else {
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this notice?')) {
      const result = await deleteNotice(id);
      if (result.error) {
        alert(result.error);
      }
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <Card variant="glass" padding="lg">
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Post New Notice</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Input name="title" label="Notice Title" required placeholder="e.g. System Maintenance" />
            <Input type="datetime-local" name="expires_at" label="Expiration Date (Defaults to 6 months)" />
            <TextArea name="content" label="Notice Content" required placeholder="Enter your announcement here..." style={{ minHeight: '100px' }} />
            <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-secondary)' }}>Attach Images (optional, max 5)</label>
              <input type="file" name="image" accept="image/*" multiple style={{ color: 'var(--text-primary)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} />
            </div>
            {error && <p style={{ color: 'var(--neon-red)' }}>{error}</p>}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Posting...' : 'Post Notice'}
            </Button>
          </form>
        </Card>

        <div>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Manage Notices</h2>
          {notices.length === 0 ? (
            <p className="text-secondary">No notices found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {notices.map((notice) => {
                const canDelete = currentUserRole === 'admin' || notice.author_id === currentUserId;
                
                return (
                  <Card key={notice.id} variant="glass" padding="md">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: 'var(--neon-cyan)', margin: '0 0 var(--space-xs) 0' }}>{notice.title}</h3>
                        <NoticeContentText content={notice.content} />
                        {(() => {
                          const urls = parseAttachmentUrls(notice.image_url);
                          if (urls.length === 0) return null;
                          return (
                            <div style={{ margin: 'var(--space-sm) 0', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                              {urls.map((url, idx) => (
                                <img 
                                  key={idx}
                                  src={url} 
                                  alt={`Notice attachment ${idx + 1}`} 
                                  style={{ maxWidth: urls.length === 1 ? '100%' : '150px', borderRadius: 'var(--radius-md)', maxHeight: '200px', objectFit: 'contain', cursor: 'pointer' }} 
                                  onClick={() => setSelectedImage(url)}
                                />
                              ))}
                            </div>
                          );
                        })()}
                        <div suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          Posted by {notice.profiles.name} ({notice.profiles.role}) on {new Date(notice.created_at).toLocaleString()}
                        </div>
                      </div>
                      {canDelete && (
                        <Button variant="secondary" onClick={() => handleDelete(notice.id)} style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
          <img 
            src={selectedImage} 
            alt="Preview" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} 
          />
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
