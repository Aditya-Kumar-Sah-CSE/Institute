'use client';
import React, { useState } from 'react';
import { TenantLink as Link } from '@/lib/tenant/TenantProvider';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)' }}>Continue Learning</h2>
        <Link href="/courses" style={{ color: 'var(--neon-cyan)' }}>Browse all courses →</Link>
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
        <Card variant="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: 'var(--space-md)' }}>🏜️</span>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>No courses yet</h3>
          <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
            Enroll in a course to start your learning journey.
          </p>
          <Link href="/courses">
            <button className="btn btn-primary btn-md">Browse Courses</button>
          </Link>
        </Card>
      )}
    </div>
  );
}
