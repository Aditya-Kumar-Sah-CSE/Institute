'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InstructorCoursesListProps {
  courses: any[];
}

export default function InstructorCoursesList({ courses }: InstructorCoursesListProps) {
  const [showAll, setShowAll] = useState(false);

  if (!courses || courses.length === 0) {
    return (
      <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)', margin: 0 }}>
        You haven&apos;t created any courses yet.
      </p>
    );
  }

  const visibleCourses = showAll ? courses : courses.slice(0, 2);
  const hasMore = courses.length > 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {visibleCourses.map((course) => (
        <div 
          key={course.id} 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: 'var(--space-md)', 
            gap: 'var(--space-md)', 
            background: 'var(--bg-input)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)'
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>
              {course.title}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              {course.is_published ? '🟢 Published' : '🟡 Draft'}
            </p>
          </div>
          <Link 
            href={`/instructor/courses/${course.id}/builder`} 
            className="btn btn-primary" 
            style={{ padding: '6px 12px', fontSize: 'var(--text-sm)', flex: '0 0 auto' }}
          >
            Start Teaching
          </Link>
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: '4px',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--neon-cyan)',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
            e.currentTarget.style.borderColor = 'var(--neon-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)';
          }}
        >
          {showAll ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show more ({courses.length - 2} more) <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
