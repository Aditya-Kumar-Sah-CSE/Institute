'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { getDifficultyColor } from '@/lib/utils';
import { enrollInCourse } from '@/features/courses/actions/enroll';
import type { Course } from '@/types';
import './CourseCard.css';

interface CourseCardProps {
  course: Course;
  progress?: number; // 0 to 1
  status?: string;
}

export default function CourseCard({ course, progress, status }: CourseCardProps) {
  const difficultyColor = getDifficultyColor(course.difficulty);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const router = useRouter();

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop link navigation
    setIsEnrolling(true);
    const res = await enrollInCourse(course.id);
    if (res?.success) {
      alert(res.message || 'Enrolled successfully!');
      router.refresh();
    } else {
      alert(res?.error || 'Failed to enroll');
    }
    setIsEnrolling(false);
  };

  return (
    <Link href={`/courses/${course.id}`} className="course-card-link">
      <Card hover variant="glass" className="course-card">
        <div className="course-card-image">
          {course.thumbnail_url ? (
            <Image 
              src={course.thumbnail_url} 
              alt={course.title} 
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="course-image-placeholder">
              <span className="course-icon">🎓</span>
            </div>
          )}
          <div 
            className="course-difficulty" 
            style={{ backgroundColor: difficultyColor }}
          >
            {course.difficulty}
          </div>
        </div>

        <div className="course-card-content">
          <h3 className="course-title">{course.title}</h3>
          {course.profiles?.name && (
            <p className="course-instructor" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
              By {course.profiles.name}
            </p>
          )}
          <p className="course-desc">
            {course.description ? (
              course.description.length > 80 
                ? `${course.description.substring(0, 80)}...` 
                : course.description
            ) : 'No description provided.'}
          </p>
          
          <div className="course-meta">
            <span className="course-meta-item">
              📚 {course.lesson_count} Lessons
            </span>
            <span className="course-meta-item text-gradient">
              ⭐ {course.total_xp} XP
            </span>
          </div>

          {progress !== undefined ? (
            status === 'pending' ? (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Button variant="secondary" fullWidth disabled>
                  Pending Approval
                </Button>
              </div>
            ) : status === 'rejected' ? (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <Button variant="danger" fullWidth disabled>
                  Enrollment Rejected
                </Button>
              </div>
            ) : (
              <div className="course-progress-wrapper">
                <div className="course-progress-info">
                  <span>Progress</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="course-progress-track">
                  <div 
                    className="course-progress-fill" 
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            )
          ) : (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <Button 
                variant="primary" 
                fullWidth 
                onClick={handleEnroll} 
                isLoading={isEnrolling}
              >
                Enroll Now
              </Button>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
