'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useLivePageContext } from '@/features/analytics/context/LivePageContext';
import './CurriculumListClient.css';

interface Lesson {
  id: string;
  title: string;
  xp_reward: number;
  assignments?: { xp_reward: number }[];
}

interface CurriculumListClientProps {
  courseId: string;
  groupedLessons: Record<string, Lesson[]>;
  sortedDates: string[];
  completedLessonIds: string[];
  isApproved: boolean;
}

const truncateTitle = (title: string) => {
  if (!title) return '';
  const words = title.trim().split(/\s+/);
  if (words.length > 3) {
    return words.slice(0, 3).join(' ') + '...';
  }
  return title;
};

export default function CurriculumListClient({ courseId, groupedLessons, sortedDates, completedLessonIds, isApproved }: CurriculumListClientProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedSet = new Set(completedLessonIds);
  const { setLiveContext } = useLivePageContext();

  useEffect(() => {
    setLiveContext({
      route: `/courses/${courseId}`,
      pageType: 'course_detail',
      pageTitle: 'Course Details',
      loadState: 'ready',
      currentEntity: {
        type: 'course',
        id: courseId,
        title: 'Enrolled Course'
      },
      availableActions: ['start_lesson', 'view_assignments', 'post_doubt']
    });
  }, [courseId, setLiveContext]);

  if (sortedDates.length === 0) return null;
  
  const displayedDates = isExpanded ? sortedDates : sortedDates.slice(0, 1);
  let globalLessonIndex = 0;

  return (
    <>
      <div className="curriculum-expandable-content">
        {displayedDates.map((dateStr, idx) => (
          <div key={`date-${dateStr}`} style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--neon-gold)', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--glass-border)' }}>
              Week {idx + 1} - {dateStr}
            </h3>
            <div className="lessons-list">
              {groupedLessons[dateStr].map((lesson) => {
                const index = globalLessonIndex++;
                const isCompleted = completedSet.has(lesson.id);
                const isLocked = !isApproved; // Lock all lessons if not approved
                const assignmentXp = lesson.assignments?.reduce((sum: number, a: any) => sum + (a.xp_reward || 0), 0) || 0;
                const formattedTitle = truncateTitle(lesson.title);

                const cardContent = (
                  <Card 
                    variant={isLocked ? 'default' : 'glass'}
                    className={`lesson-list-item ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                    title={lesson.title}
                  >
                    <div className="lesson-card-inner">
                      <span className="lesson-card-title">{formattedTitle}</span>
                      <div className="lesson-card-status">
                        {isLocked ? (
                          <span className="status-badge locked">🔒</span>
                        ) : isCompleted ? (
                          <span className="status-badge completed">✓ Done</span>
                        ) : (
                          <span className="status-badge xp">+{lesson.xp_reward} XP</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );

                if (isLocked) {
                  return <div key={lesson.id}>{cardContent}</div>;
                }

                return (
                  <Link key={lesson.id} href={`/courses/${courseId}/${lesson.id}`} style={{ textDecoration: 'none' }}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {sortedDates.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <Button 
            variant="ghost" 
            onClick={() => setIsExpanded(!isExpanded)} 
            style={{ 
              color: 'var(--neon-cyan)', 
              border: '1px solid rgba(0, 240, 255, 0.3)',
              padding: 'var(--space-sm) var(--space-xl)'
            }}
          >
            {isExpanded ? 'Show Less' : `Show More (${sortedDates.length - 1} more weeks)`}
          </Button>
        </div>
      )}
    </>
  );
}
