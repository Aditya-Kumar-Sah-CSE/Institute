'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import CourseCard from '@/features/courses/components/CourseCard';
import Card from '@/components/ui/Card';
import type { Course } from '@/types';

interface DashboardEnrollment {
  progress: number;
  status: string;
  course_id: string;
  courses: Course | null;
}

interface ContinueLearningProps {
  enrollments: any[];
  certificatesMap?: Record<string, string>;
}

export default function ContinueLearning({ enrollments, certificatesMap }: ContinueLearningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out any enrollments where course is null
  const validEnrollments = (enrollments as unknown as DashboardEnrollment[]).filter(
    (enr) => enr.courses !== null
  );

  const displayedEnrollments = isExpanded ? validEnrollments : validEnrollments.slice(0, 4);
  const hasMore = validEnrollments.length > 4;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Continue Learning</h2>
        <Link href="/courses" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', whiteSpace: 'nowrap' }}>Browse all courses →</Link>
      </div>
      
      {validEnrollments.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {displayedEnrollments.map((enr) => (
              <CourseCard key={enr.course_id} course={enr.courses!} progress={enr.progress} status={enr.status} certificateId={certificatesMap?.[enr.course_id] || null} />
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
              <button 
                className="btn btn-secondary btn-md"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show Less' : `Show More (${validEnrollments.length - 4})`}
              </button>
            </div>
          )}
        </>
      ) : (
        <Card variant="glass" style={{ padding: 'var(--space-2xl) var(--space-xl)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.03), rgba(255, 0, 128, 0.02))', border: '1px dashed var(--border-strong)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md) auto', fontSize: '1.75rem' }}>
            📚
          </div>
          <h3 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--text-xl)' }}>No Enrolled Courses Found</h3>
          <p className="text-secondary" style={{ maxWidth: '480px', margin: '0 auto var(--space-lg) auto', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
            You haven&apos;t enrolled in any courses yet. Browse our course catalog to start learning, gain XP, earn badges, and climb the leaderboard!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <Link href="/courses">
              <button className="btn btn-primary btn-md">Explore Course Catalog 🚀</button>
            </Link>
            <Link href="/leaderboard">
              <button className="btn btn-secondary btn-md">View Leaderboard 🏆</button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
