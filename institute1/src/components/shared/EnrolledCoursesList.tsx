"use client";
import React, { useState } from 'react';

export default function EnrolledCoursesList({ enrollments }: { enrollments: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!enrollments || enrollments.length === 0) {
    return <p className="text-muted">No courses enrolled yet.</p>;
  }

  const displayedCourses = isExpanded ? enrollments : enrollments.slice(0, 2);

  return (
    <div>
      <div className="enrollments-list">
        {displayedCourses.map((enr: any) => (
          <div key={enr.id} className="enrollment-item">
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
      {enrollments.length > 2 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '4px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            {isExpanded ? 'Show Less' : `Show More (${enrollments.length - 2})`}
          </button>
        </div>
      )}
    </div>
  );
}
