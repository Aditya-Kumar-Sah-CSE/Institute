'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronRight, Lock, Play, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useLivePageContext } from '@/features/analytics/context/LivePageContext';
import './CurriculumListClient.css';

interface Lesson {
  id: string;
  title: string;
  xp_reward: number;
  week_number?: number | null;
  assignments?: { xp_reward: number }[];
}

interface CurriculumListClientProps {
  courseId: string;
  courseTitle?: string;
  groupedLessons: Record<string, Lesson[]>;
  sortedDates: string[];
  completedLessonIds: string[];
  isApproved: boolean;
}

export default function CurriculumListClient({
  courseId,
  courseTitle = 'Course Curriculum',
  groupedLessons,
  sortedDates,
  completedLessonIds,
  isApproved,
}: CurriculumListClientProps) {
  // Show ALL weeks open by default so learners can see the full roadmap immediately
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const { setLiveContext } = useLivePageContext();

  useEffect(() => {
    setLiveContext({
      route: `/courses/${courseId}`,
      pageType: 'course_detail',
      pageTitle: courseTitle || 'Course Details',
      loadState: 'ready',
      currentEntity: {
        type: 'course',
        id: courseId,
        title: courseTitle || 'Enrolled Course',
      },
      availableActions: ['start_lesson', 'view_assignments', 'post_doubt'],
    });
  }, [courseId, courseTitle, setLiveContext]);

  const { totalLessons, completedCount, totalXp } = useMemo(() => {
    let total = 0;
    let done = 0;
    let xpSum = 0;
    for (const key of sortedDates) {
      for (const l of groupedLessons[key] || []) {
        total++;
        if (completedSet.has(l.id)) done++;
        const aXp = l.assignments?.reduce((s: number, a: any) => s + (a.xp_reward || 0), 0) || 0;
        xpSum += (l.xp_reward || 0) + aXp;
      }
    }
    return { totalLessons: total, completedCount: done, totalXp: xpSum };
  }, [sortedDates, groupedLessons, completedSet]);

  if (sortedDates.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '12px' }}>
        No lessons have been published in this course yet.
      </div>
    );
  }

  const allCollapsed = sortedDates.every((k) => Boolean(collapsedWeeks[k]));
  const toggleAllWeeks = () => {
    if (allCollapsed) {
      setCollapsedWeeks({});
    } else {
      const next: Record<string, boolean> = {};
      sortedDates.forEach((k) => {
        next[k] = true;
      });
      setCollapsedWeeks(next);
    }
  };

  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="curriculum-root">
      {/* Compact Curriculum Summary & Controls */}
      <div className="curriculum-toolbar">
        <div className="curriculum-progress-meta">
          <div className="curriculum-progress-top">
            <span className="curriculum-progress-title">
              {sortedDates.length} {sortedDates.length === 1 ? 'Week' : 'Weeks'} · {totalLessons} Lessons
            </span>
            <span className="curriculum-progress-pct">
              {completedCount}/{totalLessons} Completed ({pct}%)
            </span>
          </div>
          <div className="curriculum-progress-track">
            <div className="curriculum-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="curriculum-controls">
          <div className="curriculum-filter-pills" role="group" aria-label="Filter lessons">
            {(['ALL', 'PENDING', 'DONE'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`curriculum-pill-btn${statusFilter === f ? ' is-active' : ''}`}
              >
                {f === 'ALL' ? `All (${totalLessons})` : f === 'PENDING' ? `Pending (${totalLessons - completedCount})` : `Done (${completedCount})`}
              </button>
            ))}
          </div>

          {sortedDates.length > 1 && (
            <button type="button" onClick={toggleAllWeeks} className="curriculum-pill-btn">
              {allCollapsed ? `Expand All (${sortedDates.length})` : 'Collapse All'}
            </button>
          )}
        </div>
      </div>

      {/* All Weeks Rendered by Default */}
      <div className="curriculum-expandable-content">
        {sortedDates.map((groupKey, idx) => {
          const allWeekLessons = groupedLessons[groupKey] || [];
          const filteredLessons = allWeekLessons.filter((l) => {
            if (statusFilter === 'PENDING') return !completedSet.has(l.id);
            if (statusFilter === 'DONE') return completedSet.has(l.id);
            return true;
          });

          if (filteredLessons.length === 0) return null;

          const weekDone = allWeekLessons.filter((l) => completedSet.has(l.id)).length;
          const isWeekComplete = weekDone === allWeekLessons.length && allWeekLessons.length > 0;
          const isCollapsed = Boolean(collapsedWeeks[groupKey]);
          const headingLabel = /^Week\s+\d+/i.test(groupKey)
            ? groupKey
            : `Week ${idx + 1} · ${groupKey}`;

          return (
            <div key={`week-${groupKey}`} className="curriculum-week-section">
              <button
                type="button"
                className="curriculum-week-header"
                onClick={() =>
                  setCollapsedWeeks((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
                }
                aria-expanded={!isCollapsed}
              >
                <div className="curriculum-week-title-wrap">
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span className="curriculum-week-badge">{headingLabel}</span>
                  <span className="curriculum-week-count">
                    {allWeekLessons.length} {allWeekLessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                </div>

                <div className="curriculum-week-right">
                  {totalXp > 0 && (
                    <span className="curriculum-week-xp">
                      <Sparkles size={11} />
                      {allWeekLessons.reduce(
                        (sum, l) =>
                          sum +
                          (l.xp_reward || 0) +
                          (l.assignments?.reduce((s: number, a: any) => s + (a.xp_reward || 0), 0) || 0),
                        0
                      )}{' '}
                      XP
                    </span>
                  )}
                  <span className={`curriculum-week-progress${isWeekComplete ? ' is-done' : ''}`}>
                    {isWeekComplete && <CheckCircle2 size={12} />}
                    {weekDone}/{allWeekLessons.length} done
                  </span>
                </div>
              </button>

              {!isCollapsed && (
                <div className="lessons-list">
                  {filteredLessons.map((lesson) => {
                    const isCompleted = completedSet.has(lesson.id);
                    const isLocked = !isApproved;
                    const assignmentXp =
                      lesson.assignments?.reduce((sum: number, a: any) => sum + (a.xp_reward || 0), 0) || 0;
                    const totalLessonXp = (lesson.xp_reward || 0) + assignmentXp;

                    const cardContent = (
                      <Card
                        variant={isLocked ? 'default' : 'glass'}
                        className={`lesson-list-item ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                        title={lesson.title}
                      >
                        <div className="lesson-card-inner">
                          <div className="lesson-card-text">
                            <span className="lesson-card-title">{lesson.title}</span>
                            {totalLessonXp > 0 && (
                              <span className="lesson-card-xp">+{totalLessonXp} XP</span>
                            )}
                          </div>
                          <div className="lesson-card-status">
                            {isLocked ? (
                              <span className="status-badge locked" title="Enroll to unlock">
                                <Lock size={13} />
                              </span>
                            ) : isCompleted ? (
                              <span className="status-badge completed">✓ Done</span>
                            ) : (
                              <span className="status-badge start">
                                <Play size={10} fill="currentColor" /> Start
                              </span>
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
