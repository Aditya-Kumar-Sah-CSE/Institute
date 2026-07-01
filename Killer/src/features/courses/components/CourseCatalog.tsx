'use client';

import React, { useState } from 'react';
import CourseCard from './CourseCard';
import Input from '@/components/ui/Input';
import type { Course } from '@/types';
import './CourseCatalog.css';

interface CourseCatalogProps {
  courses: Course[];
  enrollments?: Record<string, { progress: number; status: string }>; // courseId -> { progress, status }
}

export default function CourseCatalog({ courses, enrollments = {} }: CourseCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'enrolled', 'beginner', 'intermediate', 'advanced'

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (course.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filter === 'enrolled') {
      return enrollments[course.id] !== undefined;
    }
    if (filter === 'all') return true;
    
    return course.difficulty === filter;
  });

  return (
    <div className="course-catalog">
      <div className="catalog-header">
        <div className="catalog-search">
          <Input 
            placeholder="Search courses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="🔍"
          />
        </div>
        <div className="catalog-filters">
          {['all', 'enrolled', 'beginner', 'intermediate', 'advanced'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredCourses.length > 0 ? (
        <div className="catalog-grid">
          {filteredCourses.map(course => (
            <CourseCard 
              key={course.id} 
              course={course} 
              progress={enrollments[course.id]?.progress} 
              status={enrollments[course.id]?.status}
            />
          ))}
        </div>
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
