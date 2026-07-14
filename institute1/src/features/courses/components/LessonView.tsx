'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import LazyVideoPlayer from '@/components/ui/LazyVideoPlayer';
import LazyPdfViewer from '@/components/ui/LazyPdfViewer';
import LazyAttachment from '@/components/ui/LazyAttachment';
import type { Lesson } from '@/types';
import { parseAttachmentUrls } from '@/lib/attachments';
import './LessonView.css';

interface LessonViewProps {
  lesson: Lesson;
  isCompleted?: boolean;
  onComplete?: () => void;
}

export default function LessonView({ lesson, isCompleted, onComplete }: LessonViewProps) {
  const embedUrl = getYouTubeEmbedUrl(lesson.youtube_url || '');

  // Sanitize lesson notes to prevent XSS attacks
  const sanitizedNotes = useMemo(() => {
    if (!lesson.notes) return '';
    
    if (typeof window === 'undefined') {
      return lesson.notes; // Skip sanitization on server side
    }

    try {
      // Depending on the bundler, DOMPurify might be the factory function or the bound instance
      const purifier = typeof DOMPurify === 'function' ? DOMPurify(window) : DOMPurify;
      
      if (purifier && typeof purifier.sanitize === 'function') {
        return purifier.sanitize(lesson.notes, {
          ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'code', 'pre', 'blockquote', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'sub', 'sup'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height'],
          ALLOW_DATA_ATTR: false,
        });
      }
      return lesson.notes;
    } catch (e) {
      console.error('Error sanitizing notes:', e);
      return lesson.notes;
    }
  }, [lesson.notes]);

  return (
    <div className="lesson-view">
      <div className="lesson-header">
        <h2 className="lesson-title">{lesson.title}</h2>
        <div className="lesson-meta">
          <span className="lesson-xp text-gradient">+{lesson.xp_reward} XP</span>
          {isCompleted && <span className="lesson-completed-badge">✓ Completed</span>}
        </div>
      </div>

      {embedUrl ? (
        <LazyVideoPlayer embedUrl={embedUrl} title={lesson.title} />
      ) : lesson.youtube_url ? (
        <div className="lesson-attachment-section" style={{ marginTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div className="glass-card" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: '24px' }}>🔗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>External Resource</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Additional reading or form</div>
            </div>
            <a 
              href={lesson.youtube_url} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary btn-sm"
            >
              Open Link
            </a>
          </div>
        </div>
      ) : null}

      {sanitizedNotes && (
        <div className="lesson-notes-section">
          <h3 className="section-title">Lesson Notes</h3>
          <div 
            className="lesson-notes-content glass-card"
            dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
          />
        </div>
      )}

      {(() => {
        const urls = parseAttachmentUrls(lesson.pdf_url);
        if (urls.length === 0) return null;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-md)' }}>
            {urls.map((url, idx) => {
              const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
              return (
                <div key={idx} style={{ marginBottom: 'var(--space-md)' }}>
                  {isPdf ? (
                    <LazyPdfViewer url={url} title={`${lesson.title} Material ${idx + 1}`} />
                  ) : (
                    <LazyAttachment url={url} type="image" title={`${lesson.title} Material ${idx + 1}`} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {!isCompleted && onComplete && (
        <div className="lesson-actions">
          <button className="btn btn-primary btn-md" onClick={onComplete}>
            Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
}
