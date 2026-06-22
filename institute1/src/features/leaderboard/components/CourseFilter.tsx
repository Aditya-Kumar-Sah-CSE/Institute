'use client';

import React from 'react';
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

  return (
    <select 
      className="input" 
      style={{ 
        maxWidth: '250px', 
        background: 'var(--bg-input)', 
        color: 'var(--text-primary)',
        border: '1px solid var(--glass-border)',
        padding: 'var(--space-sm) var(--space-md)',
        borderRadius: 'var(--radius-sm)'
      }}
      value={currentFilter}
      onChange={(e) => router.push(`?filter=${e.target.value}`)}
    >
      <option value="global">🌍 Global Overall Leaderboard</option>
      <optgroup label="Course Leaderboards">
        {courses.map(c => (
          <option key={c.id} value={c.id}>{c.title}</option>
        ))}
      </optgroup>
    </select>
  );
}
