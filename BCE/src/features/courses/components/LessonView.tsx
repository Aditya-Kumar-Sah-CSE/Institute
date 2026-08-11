'use client';

import React, { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import LazyVideoPlayer from '@/components/ui/LazyVideoPlayer';
import LazyPdfViewer from '@/components/ui/LazyPdfViewer';
import LazyAttachment from '@/components/ui/LazyAttachment';
import type { Lesson } from '@/types';
import { parseAttachmentUrls } from '@/lib/attachments';
import { Play, FileText, Paperclip, CheckCircle, ExternalLink } from 'lucide-react';
import './LessonView.css';

interface LessonViewProps {
  lesson: Lesson;
  isCompleted?: boolean;
  onComplete?: () => void;
}

type TabId = 'video' | 'notes' | 'materials';

export default function LessonView({ lesson, isCompleted, onComplete }: LessonViewProps) {
  const embedUrl = getYouTubeEmbedUrl(lesson.youtube_url || '');
  const hasVideo = !!embedUrl;
  const hasExternalLink = !embedUrl && !!lesson.youtube_url;
  const attachmentUrls = parseAttachmentUrls(lesson.pdf_url);
  const hasAttachments = attachmentUrls.length > 0;

  // Sanitize lesson notes to prevent XSS attacks
  const sanitizedNotes = useMemo(() => {
    if (!lesson.notes) return '';
    
    if (typeof window === 'undefined') {
      return lesson.notes;
    }

    try {
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

  const hasNotes = !!sanitizedNotes;

  // Build available tabs dynamically
  const tabs = useMemo(() => {
    const t: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [];

    if (hasVideo || hasExternalLink) {
      t.push({ id: 'video', label: hasVideo ? 'Video' : 'Resource', icon: hasVideo ? <Play size={15} /> : <ExternalLink size={15} /> });
    }

    if (hasNotes) {
      t.push({ id: 'notes', label: 'Notes', icon: <FileText size={15} /> });
    }

    if (hasAttachments) {
      t.push({ id: 'materials', label: 'Materials', icon: <Paperclip size={15} />, badge: attachmentUrls.length });
    }

    return t;
  }, [hasVideo, hasExternalLink, hasNotes, hasAttachments, attachmentUrls.length]);

  const defaultTab = tabs.length > 0 ? tabs[0].id : 'video';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // If no tabs, show a simple view
  if (tabs.length === 0) {
    return (
      <div className="lesson-view">
        <div className="lesson-header">
          <div>
            <h2 className="lesson-title">{lesson.title}</h2>
          </div>
          <div className="lesson-meta">
            <span className="lesson-xp">+{lesson.xp_reward} XP</span>
            {isCompleted && <span className="lesson-completed-badge">✓ Completed</span>}
          </div>
        </div>
        <div className="lesson-tab-content">
          <div className="lesson-empty-state">
            <span className="empty-icon">📚</span>
            <p className="empty-text">No content has been added to this lesson yet.</p>
          </div>
          {!isCompleted && onComplete && (
            <div className="lesson-actions">
              <button className="lesson-complete-btn" onClick={onComplete}>
                <CheckCircle size={20} />
                Mark as Completed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-view">
      {/* Header */}
      <div className="lesson-header">
        <div>
          <h2 className="lesson-title">{lesson.title}</h2>
        </div>
        <div className="lesson-meta">
          <span className="lesson-xp">+{lesson.xp_reward} XP</span>
          {isCompleted && <span className="lesson-completed-badge">✓ Completed</span>}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="lesson-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`lesson-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="lesson-tab-content" key={activeTab}>
        {/* Video / External Link Tab */}
        {activeTab === 'video' && (
          <>
            {hasVideo ? (
              <LazyVideoPlayer embedUrl={embedUrl!} title={lesson.title} />
            ) : hasExternalLink ? (
              <div className="lesson-external-link">
                <div className="link-icon">🔗</div>
                <div className="link-info">
                  <div className="link-title">External Resource</div>
                  <div className="link-url">{lesson.youtube_url}</div>
                </div>
                <a 
                  href={lesson.youtube_url!} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Open Link
                </a>
              </div>
            ) : null}
          </>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="lesson-notes-section">
            <div 
              className="lesson-notes-content"
              dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
            />
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="lesson-attachments-grid">
            {attachmentUrls.map((url, idx) => {
              const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
              return (
                <div key={idx}>
                  {isPdf ? (
                    <LazyPdfViewer url={url} title={`${lesson.title} Material ${idx + 1}`} />
                  ) : (
                    <LazyAttachment url={url} type="image" title={`${lesson.title} Material ${idx + 1}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Complete Button — always at the bottom of any tab */}
        {!isCompleted && onComplete && (
          <div className="lesson-actions">
            <button className="lesson-complete-btn" onClick={onComplete}>
              <CheckCircle size={20} />
              Mark as Completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
