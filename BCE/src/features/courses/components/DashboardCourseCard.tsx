'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Play, ArrowRight, BookOpen } from 'lucide-react';
import Card from '@/components/ui/Card';
import {
  COURSE_UPDATED_EVENT,
  readLastCourseActivity,
  type LastCourseActivity,
} from '@/features/courses/lib/courseProgressTracker';

export interface DashboardCourseSummary {
  enrolledCount: number;
  courseId: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  progressPct: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}

export default function DashboardCourseCard({
  initialSummary,
}: {
  initialSummary: DashboardCourseSummary | null;
}) {
  const [lastLocal, setLastLocal] = useState<LastCourseActivity | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncLocal = () => {
      setLastLocal(readLastCourseActivity());
    };
    syncLocal();
    window.addEventListener(COURSE_UPDATED_EVENT, syncLocal);
    window.addEventListener('storage', syncLocal);
    return () => {
      window.removeEventListener(COURSE_UPDATED_EVENT, syncLocal);
      window.removeEventListener('storage', syncLocal);
    };
  }, []);

  const hasEnrolledCourse = Boolean(initialSummary && initialSummary.enrolledCount > 0);
  const activeCourseId = (mounted && lastLocal?.courseId) || initialSummary?.courseId || null;
  const activeCourseTitle = (mounted && lastLocal?.courseTitle) || initialSummary?.courseTitle || 'My Courses';
  const resumeLessonId =
    (mounted && lastLocal?.courseId === activeCourseId && lastLocal?.lessonId) ||
    (mounted && lastLocal?.lessonId) ||
    initialSummary?.nextLessonId ||
    null;
  const resumeLessonTitle =
    (mounted && lastLocal?.courseId === activeCourseId && lastLocal?.lessonTitle) ||
    (mounted && lastLocal?.lessonTitle) ||
    initialSummary?.nextLessonTitle ||
    null;

  const continueHref = activeCourseId
    ? resumeLessonId
      ? `/courses/${activeCourseId}/${resumeLessonId}`
      : `/courses/${activeCourseId}`
    : '/courses';

  const progressPct = initialSummary?.progressPct ?? 0;
  const completedLessons = initialSummary?.completedLessons ?? 0;
  const totalLessons = initialSummary?.totalLessons ?? 0;
  const isCompletedCourse = totalLessons > 0 && completedLessons >= totalLessons;

  return (
    <Card
      variant="glass"
      padding="lg"
      className="stat-card hover-lift"
      style={{
        position: 'relative',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%' }}>
        <Link href="/courses" style={{ textDecoration: 'none' }} title="Browse All Courses">
          <div
            className="stat-card-icon"
            style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--neon-cyan)', cursor: 'pointer' }}
          >
            <GraduationCap size={24} />
          </div>
        </Link>

        <div className="stat-card-content" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
            <Link href="/courses" style={{ textDecoration: 'none' }}>
              <div className="stat-card-value" style={{ color: 'var(--neon-cyan)', fontSize: '1.4rem', fontWeight: 800 }}>
                Course <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>View</span>
              </div>
            </Link>

            {totalLessons > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isCompletedCourse ? '#10b981' : 'var(--neon-cyan)',
                  background: isCompletedCourse ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)',
                  border: `1px solid ${isCompletedCourse ? 'rgba(16,185,129,0.35)' : 'rgba(6,182,212,0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={`${completedLessons} of ${totalLessons} lessons completed in ${activeCourseTitle}`}
              >
                <BookOpen size={11} /> {completedLessons}/{totalLessons} · {progressPct}%
              </span>
            )}
          </div>

          <Link href="/courses" style={{ textDecoration: 'none' }}>
            <div
              className="text-secondary stat-card-label"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={activeCourseTitle}
            >
              {hasEnrolledCourse && initialSummary ? activeCourseTitle : 'MY COURSES'}
            </div>
          </Link>
        </div>
      </div>

      {/* Subtle course progress hairline */}
      {totalLessons > 0 && (
        <div
          style={{
            width: '100%',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              width: `${Math.max(4, progressPct)}%`,
              height: '100%',
              background: isCompletedCourse
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              borderRadius: '999px',
              transition: 'width 0.35s ease',
            }}
          />
        </div>
      )}

      {/* Continue Course Action Row */}
      {activeCourseId ? (
        <div
          style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '175px',
            }}
            title={resumeLessonTitle || activeCourseTitle}
          >
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              {mounted && lastLocal?.lessonId ? 'Last:' : 'Next:'}
            </span>{' '}
            {resumeLessonTitle || activeCourseTitle}
          </div>

          <Link
            href={continueHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <Play size={11} fill="currentColor" /> Continue Course →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: '8px' }}>
          <Link
            href="/courses"
            style={{
              fontSize: '11px',
              color: 'var(--neon-cyan)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            Explore Courses <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </Card>
  );
}

