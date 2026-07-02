'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
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
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop link navigation
    setIsEnrolling(true);
    const res = await enrollInCourse(course.id);
    if (res?.success) {
      setAlertMessage(res.message || 'Enrolled successfully!');
      router.refresh();
    } else {
      setAlertMessage(res?.error || 'Failed to enroll');
    }
    setIsEnrolling(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/courses/${course.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setAlertMessage('Course link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
      prompt('Copy this link to share:', url);
    }
  };

  return (
    <>
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
              {course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)}
            </div>
            <button
              onClick={handleShare}
              className="course-share-btn"
              title="Share Course"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
            </button>
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

      <Modal 
        isOpen={!!alertMessage} 
        onClose={() => setAlertMessage(null)} 
        title="Smart Learning App"
        size="sm"
      >
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {alertMessage}
          </p>
          <Button 
            variant="primary" 
            onClick={() => setAlertMessage(null)}
            fullWidth
          >
            OK
          </Button>
        </div>
      </Modal>
    </>
  );
}
