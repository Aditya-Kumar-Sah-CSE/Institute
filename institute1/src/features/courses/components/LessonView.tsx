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
