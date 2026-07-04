'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Download, Eye } from 'lucide-react';
import Button from './Button';

interface LazyAttachmentProps {
  url: string;
  type?: 'image' | 'pdf' | 'other';
  title?: string;
}

export default function LazyAttachment({ url, type, title = 'Attachment' }: LazyAttachmentProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-detect type if not provided
  const inferredType = type || (url.split('?')[0].toLowerCase().endsWith('.pdf') ? 'pdf' : url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'image' : 'other');

  if (inferredType === 'pdf') {
    // If we wanted to, we could use LazyPdfViewer here, but to avoid circular deps 
    // or heavy components, we can just link to it or dynamically import LazyPdfViewer.
    // For now, let's just use the click-to-view external link for PDFs in attachments,
    // or we can just render the placeholder.
    return (
      <div style={{ position: 'relative', width: '100%', height: '150px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-primary)', textDecoration: 'none' }}>
          <span style={{ fontSize: '3rem' }}>📄</span>
          <span style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-xs)' }}>View PDF</span>
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '150px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
      {!isLoaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <ImageIcon size={32} className="text-secondary" style={{ marginBottom: '8px' }} />
          <Button variant="secondary" size="sm" onClick={() => setIsLoaded(true)}>
            <Eye size={14} style={{ marginRight: '6px' }} /> Load Image
          </Button>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
          <Image src={url} alt={title} fill style={{ objectFit: 'contain' }} unoptimized />
        </a>
      )}
    </div>
  );
}
