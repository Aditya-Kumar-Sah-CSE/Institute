"use client";
import React, { useState } from 'react';

export default function EnrolledCoursesList({ enrollments }: { enrollments: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const initialLimit = 2;
  
  if (!enrollments || enrollments.length === 0) {
    return <p className="text-muted">No courses enrolled yet.</p>;
  }

  const displayedCourses = isExpanded ? enrollments : enrollments.slice(0, initialLimit);
  const remainingCount = enrollments.length - initialLimit;

  return (
    <div>
      <div className="enrollments-list">
        {displayedCourses.map((enr: any) => (
          <div key={enr.id} className="enrollment-item" style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
            <div className="enrollment-icon">🎓</div>
            <div className="enrollment-details">
              <h4>{enr.course?.title}</h4>
              <div className="enrollment-progress">
                <div className="progress-bar-small">
                  <div className="progress-fill-small" style={{ width: `${Math.round(enr.progress * 100)}%` }} />
                </div>
                <span className="progress-text">{Math.round(enr.progress * 100)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <button 
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: 'var(--neon-cyan)',
              padding: '6px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '4px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.16)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'; }}
          >
            {isExpanded ? 'Show Less' : `See More (${remainingCount} more)`}
          </button>
        </div>
      )}
    </div>
  );
}

