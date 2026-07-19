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
  expires_at?: string;
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
              height: urls.length === 1 ? '200px' : 'clamp(100px, calc(50vw - var(--space-md)), 150px)', 
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: 'var(--space-md)', minWidth: 0 }}>
        {notices.map((notice) => (
          <Card key={notice.id} variant="glass" padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
              <h3 style={{ color: 'var(--neon-cyan)', margin: 0 }}>{notice.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
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
            <p style={{ margin: '0 0 var(--space-md) 0', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
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
