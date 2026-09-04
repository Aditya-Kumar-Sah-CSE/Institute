'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import LazyVideoPlayer from '@/components/ui/LazyVideoPlayer';
import LazyPdfViewer from '@/components/ui/LazyPdfViewer';
import LazyAttachment from '@/components/ui/LazyAttachment';
import type { Lesson, Assignment, Submission } from '@/types';
import { parseAttachmentUrls } from '@/lib/attachments';
import { Play, FileText, Paperclip, CheckCircle, ExternalLink, ClipboardList, MessageCircle } from 'lucide-react';
import AssignmentCard from '@/features/courses/components/AssignmentCard';
import LessonDoubts from '@/app/(dashboard)/courses/[courseId]/[lessonId]/components/LessonDoubts';
import './LessonView.css';

interface LessonViewProps {
  lesson: Lesson;
  isCompleted?: boolean;
  onComplete?: () => void;

  // Assignments & Doubts props
  assignments?: Assignment[];
  submissions?: Submission[];
  allSubmissions?: any[];
  submitAssignment?: (assignmentId: string, formData: FormData) => Promise<void>;
  doubts?: any[];
  courseId?: string;
  lessonId?: string;
  showDoubts?: boolean;
}

type TabId = 'video' | 'notes' | 'materials' | 'assignments' | 'doubts';

export default function LessonView({
  lesson,
  isCompleted,
  onComplete,
  assignments = [],
  submissions = [],
  allSubmissions = [],
  submitAssignment,
  doubts = [],
  courseId,
  lessonId,
  showDoubts = false,
}: LessonViewProps) {
  const embedUrl = getYouTubeEmbedUrl(lesson.youtube_url || '');
  const hasVideo = !!embedUrl;
  const hasExternalLink = !embedUrl && !!lesson.youtube_url;
  const attachmentUrls = parseAttachmentUrls(lesson.pdf_url);
  const hasAttachments = attachmentUrls.length > 0;
  const hasAssignments = assignments.length > 0;
  const hasDoubts = showDoubts;

  const searchParams = useSearchParams();
  const askDoubtParam = searchParams ? searchParams.get('askDoubt') : null;
  const fromCompilerParam = searchParams ? searchParams.get('fromCompiler') : null;

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

    if (hasAssignments) {
      t.push({ id: 'assignments', label: 'Assignments', icon: <ClipboardList size={15} />, badge: assignments.length });
    }

    if (hasDoubts) {
      t.push({ id: 'doubts', label: 'Doubts', icon: <MessageCircle size={15} />, badge: doubts.length > 0 ? doubts.length : undefined });
    }

    return t;
  }, [hasVideo, hasExternalLink, hasNotes, hasAttachments, attachmentUrls.length, hasAssignments, assignments.length, hasDoubts, doubts.length]);

  const initialTab = useMemo(() => {
    if (askDoubtParam === 'true' && hasDoubts) return 'doubts';
    if (fromCompilerParam === 'true' && hasAssignments) return 'assignments';
    return tabs.length > 0 ? tabs[0].id : 'video';
  }, [askDoubtParam, fromCompilerParam, hasDoubts, hasAssignments, tabs]);

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (askDoubtParam === 'true' && hasDoubts) {
      setActiveTab('doubts');
    } else if (fromCompilerParam === 'true' && hasAssignments) {
      setActiveTab('assignments');
    }
  }, [askDoubtParam, fromCompilerParam, hasDoubts, hasAssignments]);

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

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            {assignments.map(assign => {
              const sub = submissions.find(s => s.assignment_id === assign.id);
              const communitySubs = allSubmissions.filter(s => s.assignment_id === assign.id);
              const submitAction = submitAssignment ? submitAssignment.bind(null, assign.id) : async () => {};
              return (
                <AssignmentCard
                  key={assign.id}
                  assignment={assign}
                  submission={sub}
                  communitySubmissions={communitySubs}
                  onSubmit={submitAction}
                />
              );
            })}
          </div>
        )}

        {/* Doubts Tab */}
        {activeTab === 'doubts' && showDoubts && courseId && lessonId && (
          <LessonDoubts courseId={courseId} lessonId={lessonId} doubts={doubts} />
        )}

        {/* Complete Button — always available for main content */}
        {!isCompleted && onComplete && ['video', 'notes', 'materials'].includes(activeTab) && (
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
