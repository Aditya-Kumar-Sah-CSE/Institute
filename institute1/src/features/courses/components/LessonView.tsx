'use client';

import React from 'react';
import { getYouTubeEmbedUrl } from '@/lib/utils';
import type { Lesson } from '@/types';
import './LessonView.css';

interface LessonViewProps {
  lesson: Lesson;
  isCompleted?: boolean;
  onComplete?: () => void;
}

export default function LessonView({ lesson, isCompleted, onComplete }: LessonViewProps) {
  const embedUrl = getYouTubeEmbedUrl(lesson.youtube_url || '');

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
        <div className="lesson-video-container">
          <iframe
            className="lesson-video-frame"
            src={embedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : lesson.youtube_url ? (
        <div className="lesson-video-error glass-card">
          Invalid YouTube URL provided.
        </div>
      ) : null}

      {lesson.notes && (
        <div className="lesson-notes-section">
          <h3 className="section-title">Lesson Notes</h3>
          <div 
            className="lesson-notes-content glass-card"
            dangerouslySetInnerHTML={{ __html: lesson.notes }}
          />
        </div>
      )}

      {lesson.pdf_url && (
        <div className="lesson-attachment-section" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 className="section-title">Attachments</h3>
          <div className="glass-card" style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>Lesson Materials</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>PDF or Image notes</div>
            </div>
            <a 
              href={lesson.pdf_url} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-sm"
            >
              View Attachment
            </a>
          </div>
        </div>
      )}

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
