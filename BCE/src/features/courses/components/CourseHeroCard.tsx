'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, BookOpen } from 'lucide-react';

interface CourseHeroCardProps {
  children: React.ReactNode;
  courseTitle?: string;
  instructorName?: string;
  initialCollapsed?: boolean;
}

export default function CourseHeroCard({
  children,
  courseTitle,
  instructorName,
  initialCollapsed = true,
}: CourseHeroCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  return (
    <div className="course-hero glass-card" style={{ position: 'relative', transition: 'all 0.3s ease', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
      <button
        type="button"
        onClick={() => setIsCollapsed(prev => !prev)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
        title={isCollapsed ? 'Expand Course Details' : 'Collapse Course Details'}
      >
        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>

      {!isCollapsed ? (
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--glass-border)', paddingRight: '50px', flexWrap: 'wrap' }}>
            <BookOpen size={22} style={{ color: 'var(--neon-cyan)' }} />
            <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 800 }}>
              Course Details: <span className="text-gradient" style={{ marginLeft: '4px' }}>{courseTitle || 'Overview'}</span>
            </h2>
            {instructorName && (
              <span style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 600, background: 'rgba(6, 182, 212, 0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                Instructor: {instructorName}
              </span>
            )}
          </div>
          {children}
        </div>
      ) : (
        <div 
          onClick={() => setIsCollapsed(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '4px 8px', 
            cursor: 'pointer',
            userSelect: 'none',
            flexWrap: 'wrap',
            paddingRight: '60px'
          }}
          title="Click to expand course details"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} style={{ color: 'var(--neon-cyan)' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Course Details: <span className="text-gradient" style={{ marginLeft: '4px' }}>{courseTitle || 'Course Overview'}</span>
            </span>
          </div>
          {instructorName && (
            <span style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 600, background: 'rgba(6, 182, 212, 0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              Instructor: {instructorName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
