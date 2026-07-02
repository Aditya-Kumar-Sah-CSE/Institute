'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  title: string;
}

interface CourseFilterProps {
  courses: Course[];
  currentFilter: string;
}

export default function CourseFilter({ courses, currentFilter }: CourseFilterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    setIsOpen(false);
    router.push(`?filter=${value}`);
  };

  const getLabel = () => {
    if (currentFilter === 'global') return '🌍 Global Overall Leaderboard';
    const course = courses.find(c => c.id === currentFilter);
    return course ? course.title : '🌍 Global Overall Leaderboard';
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', maxWidth: '300px', zIndex: 50 }}>
      <style>{`
        .dropdown-item {
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          color: var(--text-primary);
          transition: background 0.2s;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .dropdown-item.active {
          background: rgba(0, 240, 255, 0.1);
          color: var(--neon-cyan);
        }
      `}</style>
      <button 
        type="button"
        className="input" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-input)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--glass-border)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getLabel()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px', minWidth: '16px' }}><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 4px)', 
          left: 0, 
          right: 0, 
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-xs) 0',
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div 
            onClick={() => handleSelect('global')}
            className={`dropdown-item ${currentFilter === 'global' ? 'active' : ''}`}
          >
            🌍 Global Overall Leaderboard
          </div>
          
          {courses.length > 0 && (
            <>
              <div style={{ 
                padding: 'var(--space-xs) var(--space-md)', 
                fontSize: 'var(--text-xs)', 
                color: 'var(--text-muted)',
                marginTop: 'var(--space-sm)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Course Leaderboards
              </div>
              
              {courses.map(c => (
                <div 
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`dropdown-item ${currentFilter === c.id ? 'active' : ''}`}
                >
                  {c.title}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
