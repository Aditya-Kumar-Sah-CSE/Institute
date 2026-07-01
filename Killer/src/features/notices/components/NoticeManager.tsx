'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import { createNotice, deleteNotice } from '../actions';
import type { Notice } from './NoticeBoard';

interface NoticeManagerProps {
  notices: Notice[];
  currentUserId: string;
  currentUserRole: string;
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
            <TextArea name="content" label="Notice Content" required placeholder="Enter your announcement here..." style={{ minHeight: '100px' }} />
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', color: 'var(--text-secondary)' }}>Attach Image (optional)</label>
              <input type="file" name="image" accept="image/*" style={{ color: 'var(--text-primary)' }} />
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
                        <p style={{ margin: '0 0 var(--space-xs) 0', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                        {notice.image_url && (
                          <div style={{ margin: 'var(--space-sm) 0' }}>
                            <img 
                              src={notice.image_url} 
                              alt="Notice attachment" 
                              style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)', maxHeight: '200px', objectFit: 'contain', cursor: 'pointer' }} 
                              onClick={() => setSelectedImage(notice.image_url!)}
                            />
                          </div>
                        )}
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
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
