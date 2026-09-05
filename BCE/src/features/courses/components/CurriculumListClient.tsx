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

                return (
                  <Card 
                    key={lesson.id} 
                    variant={isLocked ? 'default' : 'glass'}
                    className={`lesson-list-item ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="lesson-list-item-content">
                      <h3 className="lesson-list-item-title">{lesson.title}</h3>
                      
                      <div className="lesson-actions-container">
                        {isLocked ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-md)', width: '100%' }}>
                            {isCompleted && <span className="completed-mark" style={{ color: 'var(--neon-lime)', fontWeight: 'bold' }}>✓</span>}
                            <span className="locked-mark">🔒</span>
                          </div>
                        ) : isCompleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-md)', width: '100%' }}>
                            <span className="completed-mark" style={{ color: 'var(--neon-lime)', fontWeight: 'bold' }}>✓</span>
                            <Link href={`/courses/${courseId}/${lesson.id}`}>
                              <Button variant="secondary" size="md" style={{ minHeight: '44px' }}>Review / Task</Button>
                            </Link>
                          </div>
                        ) : (
                          <>
                            {assignmentXp > 0 && (
                              <div className="lesson-action-group">
                                <span className="lesson-reward text-gradient" style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>+{assignmentXp} XP</span>
                                <Link href={`/courses/${courseId}/${lesson.id}#assignments`} style={{ flex: 1, display: 'flex' }}>
                                  <Button variant="secondary" size="md" style={{ width: '100%', minHeight: '44px' }}>Assignment</Button>
                                </Link>
                              </div>
                            )}
                            
                            <div className="lesson-action-group">
                              <span className="lesson-reward text-gradient" style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>+{lesson.xp_reward} XP</span>
                              <Link href={`/courses/${courseId}/${lesson.id}`} style={{ flex: 1, display: 'flex' }}>
                                <Button variant="primary" size="md" style={{ width: '100%', minHeight: '44px' }}>Start</Button>
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
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
