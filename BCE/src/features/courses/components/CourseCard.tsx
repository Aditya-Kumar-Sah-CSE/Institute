'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { BadgeCheck, Share2 } from 'lucide-react';
import { getDifficultyColor } from '@/lib/utils';
import { enrollInCourse, getTopEnrolledStudents } from '@/features/courses/actions/enroll';
import type { Course } from '@/types';
import './CourseCard.css';

function FallbackAvatar({ src, name, size }: { src?: string | null, name?: string | null, size: number }) {
  const [error, setError] = useState(false);
  
  if (!src || error) {
    return <span style={{ fontSize: size * 0.4, color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{(name || 'S').charAt(0).toUpperCase()}</span>;
  }
  return <img src={src} alt={name || 'User'} width={size} height={size} style={{ objectFit: 'cover', borderRadius: '50%' }} onError={() => setError(true)} />;
}

interface CourseCardProps {
  course: Course;
  progress?: number; // 0 to 1
  status?: string;
  certificateId?: string | null;
}

export default function CourseCard({ course, progress, status, certificateId }: CourseCardProps) {
  const difficultyColor = getDifficultyColor(course.difficulty);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const router = useRouter();

  useEffect(() => {
    getTopEnrolledStudents(course.id, 3).then(res => {
      setEnrolledStudents(res.students);
      setTotalEnrolled(res.total);
    });
  }, [course.id]);

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop link navigation
    if (!window.confirm(`Do you want to enroll in ${course.title}?`)) return;
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
          <div className="course-card-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xs)' }}>
              <h3 className="course-title" style={{ margin: 0, paddingRight: '8px' }}>{course.title}</h3>
              <div 
                style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--neon-green)', letterSpacing: '0.5px', flexShrink: 0 }}
              >
                {course.difficulty}
              </div>
            </div>
            {course.profiles?.name && (
              <p className="course-instructor" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                By {course.profiles.name} <BadgeCheck size={14} style={{ color: 'var(--neon-cyan)' }} />
              </p>
            )}
            <p className="course-desc">
              {course.description ? (
                course.description.length > 80 
                  ? `${course.description.substring(0, 80)}...` 
                  : course.description
              ) : 'No description provided.'}
            </p>


            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
              <div style={{ flex: '1 1 85%' }}>
                {progress !== undefined ? (
                  status === 'pending' ? (
                    <Button variant="secondary" fullWidth disabled>
                      Pending Approval
                    </Button>
                  ) : status === 'rejected' ? (
                    <Button variant="danger" fullWidth disabled>
                      Enrollment Rejected
                    </Button>
                  ) : (
                    <div className="course-progress-wrapper" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
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
                  <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={handleEnroll} 
                    isLoading={isEnrolling}
                  >
                    Enroll Now
                  </Button>
                )}
              </div>

              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={handleShare}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--neon-cyan)'; e.currentTarget.style.borderColor = 'var(--neon-cyan)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Share Course"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
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

      <Modal
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        title="Joined Students Preview"
        size="sm"
      >
        <div style={{ padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            {enrolledStudents.map((student) => (
              <div key={student.user_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <FallbackAvatar src={student.profiles?.avatar_url} name={student.profiles?.name} size={36} />
                </div>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>{student.profiles?.name}</span>
              </div>
            ))}
          </div>

          {(status === 'approved' || status === 'pending') ? (
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsStudentsModalOpen(false);
                router.push(`/courses/${course.id}#joined-students`);
              }}
            >
              View all {totalEnrolled} joined students
            </Button>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'rgba(0, 242, 254, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>Enroll in the course to view all {totalEnrolled} students</p>
              {!status && (
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={(e) => {
                    setIsStudentsModalOpen(false);
                    handleEnroll(e);
                  }} 
                  isLoading={isEnrolling}
                >
                  Enroll Now
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
