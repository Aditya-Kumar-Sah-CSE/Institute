'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import { parseAttachmentUrls } from '@/lib/attachments';

export interface Notice {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  image_url?: string;
  profiles: {
    name: string;
    role: string;
    email?: string;
  };
}

interface NoticeBoardProps {
  notices: Notice[];
  emptyMessage?: string;
}

export default function NoticeBoard({ notices, emptyMessage = 'No notices available.' }: NoticeBoardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!notices || notices.length === 0) {
    return (
      <Card variant="glass" padding="lg" style={{ textAlign: 'center' }}>
        <p className="text-secondary">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {notices.map((notice) => (
          <Card key={notice.id} variant="glass" padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
              <h3 style={{ color: 'var(--neon-cyan)', margin: 0 }}>{notice.title}</h3>
              <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {new Date(notice.created_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p style={{ margin: '0 0 var(--space-md) 0', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
            {(() => {
              const urls = parseAttachmentUrls(notice.image_url);
              if (urls.length === 0) return null;
              
              return (
                <div style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {urls.map((url, idx) => (
                    <div 
                      key={idx} 
                      style={{ position: 'relative', width: urls.length === 1 ? '100%' : '150px', height: urls.length === 1 ? '400px' : '150px', cursor: 'pointer', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} 
                      onClick={() => setSelectedImage(url)}
                    >
                      <Image 
                        src={url} 
                        alt={`Notice attachment ${idx + 1}`} 
                        fill
                        sizes={urls.length === 1 ? "(max-width: 768px) 100vw, 50vw" : "150px"}
                        style={{ objectFit: 'contain' }} 
                      />
                    </div>
                  ))}
                </div>
              );
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
        ))}
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
