'use client';

import React, { useState, useMemo } from 'react';
import CourseCard from './CourseCard';
import Input from '@/components/ui/Input';
import { Search } from 'lucide-react';
import type { Course } from '@/types';
import './CourseCatalog.css';

interface CourseCatalogProps {
  courses: Course[];
  enrollments?: Record<string, { progress: number; status: string }>; // courseId -> { progress, status }
  certificatesMap?: Record<string, string>;
}

export default function CourseCatalog({ courses, enrollments = {}, certificatesMap = {} }: CourseCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled'>('enrolled');
  const [semesterFilter, setSemesterFilter] = useState('all'); // 'all', 'sem 1', 'sem 2', etc.

  const [showAllCourses, setShowAllCourses] = useState(false);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (course.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      if (enrollmentFilter === 'enrolled' && enrollments[course.id] === undefined) {
        return false;
      }
      
      if (semesterFilter !== 'all' && course.difficulty !== semesterFilter) {
        return false;
      }
      
      return true;
    });
  }, [courses, searchTerm, enrollmentFilter, semesterFilter, enrollments]);

  const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, 2);

  return (
    <div className="course-catalog">
      <div className="catalog-header" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* Top bar: Search + Enrollment Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div className="catalog-search" style={{ flex: 1, minWidth: '250px' }}>
            <Input 
              placeholder="Search courses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} style={{ color: 'var(--text-muted)' }} />}
            />
          </div>
          
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-sm)', gap: '4px' }}>
            <button 
              className={`btn-ghost ${enrollmentFilter === 'all' ? 'active' : ''}`}
              style={{ padding: '8px 16px', borderRadius: '4px', background: enrollmentFilter === 'all' ? 'var(--bg-secondary)' : 'transparent', color: enrollmentFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: enrollmentFilter === 'all' ? 'var(--weight-semibold)' : 'normal' }}
              onClick={() => setEnrollmentFilter('all')}
            >
              All Courses
            </button>
            <button 
              className={`btn-ghost ${enrollmentFilter === 'enrolled' ? 'active' : ''}`}
              style={{ padding: '8px 16px', borderRadius: '4px', background: enrollmentFilter === 'enrolled' ? 'var(--bg-secondary)' : 'transparent', color: enrollmentFilter === 'enrolled' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: enrollmentFilter === 'enrolled' ? 'var(--weight-semibold)' : 'normal' }}
              onClick={() => setEnrollmentFilter('enrolled')}
            >
              My Enrolled
            </button>
          </div>
        </div>

        {/* Bottom bar: Semester Filters */}
        <div className="catalog-filters">
          {['all', 'sem 1', 'sem 2', 'sem 3', 'sem 4', 'sem 5', 'sem 6', 'sem 7', 'sem 8'].map(f => (
            <button
              key={f}
              className={`filter-btn ${semesterFilter === f ? 'active' : ''}`}
              onClick={() => setSemesterFilter(f)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: semesterFilter === f ? 'var(--neon-cyan)' : 'var(--border-color)',
                background: semesterFilter === f ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                color: semesterFilter === f ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {f === 'all' ? 'All Semesters' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredCourses.length > 0 ? (
        <>
          <div className="catalog-grid">
            {visibleCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                progress={enrollments[course.id]?.progress} 
                status={enrollments[course.id]?.status}
                certificateId={certificatesMap[course.id]}
              />
            ))}
          </div>
          
          {!showAllCourses && filteredCourses.length > 2 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowAllCourses(true)}
                style={{ width: '100%', padding: '16px', fontWeight: 'bold' }}
              >
                Show all {filteredCourses.length} courses
              </button>
            </div>
          )}

          {showAllCourses && filteredCourses.length > 2 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button 
                className="btn-ghost" 
                onClick={() => setShowAllCourses(false)}
                style={{ width: '100%', padding: '16px', fontWeight: 'bold', border: '1px solid var(--glass-border)' }}
              >
                Show Less
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="catalog-empty">
          <span className="empty-icon">🏜️</span>
          <h3>No courses found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
