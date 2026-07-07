'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Image from 'next/image';
import { BadgeCheck } from 'lucide-react';
import { getLevelColor } from '@/lib/utils';
// Mocking enroll backend for UI Clone
const enrollInCourse = async (id: string) => ({ success: true, message: 'Enrolled!', error: undefined });
const getTopEnrolledStudents = async (id: string, count: number) => ({ students: [], total: 0 });
type Course = any;
import './CourseCard.css';

interface CourseCardProps {
  course: Course;
  progress?: number; // 0 to 1
  status?: string;
  certificateId?: string | null;
}

export default function CourseCard({ course, progress, status, certificateId }: CourseCardProps) {
  const difficultyColor = getLevelColor(course.difficulty);
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
            
            <div className="course-meta">
              <span className="course-meta-item">
                📚 {course.lesson_count} Lessons
              </span>
              <span className="course-meta-item text-gradient">
                ⭐ {course.total_xp} XP
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
              {totalEnrolled > 0 ? (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsStudentsModalOpen(true);
                  }}
                >
                  <div style={{ display: 'flex', marginLeft: '8px' }}>
                    {enrolledStudents.map((student, i) => (
                      <div key={student.user_id} style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--glass-bg)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -8, overflow: 'hidden', zIndex: 3 - i }}>
                        {student.profiles?.avatar_url ? (
                          <Image src={student.profiles.avatar_url} alt={student.profiles.name || 'User'} width={24} height={24} style={{ objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{(student.profiles?.name || 'S').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {totalEnrolled} joined
                  </span>
                </div>
              ) : (
                <div />
              )}

              <div 
                style={{ fontSize: '0.75rem', color: 'var(--neon-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 215, 0, 0.1)', border: '1px dashed rgba(255, 215, 0, 0.3)', padding: '2px 8px', borderRadius: '12px' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (certificateId) {
                    router.push(`/certificates/${certificateId}`);
                  } else {
                    router.push(`/certificates/dummy?courseId=${course.id}`);
                  }
                }}
                title={certificateId ? "View Real Certificate" : "Preview Certificate"}
              >
                📜 {certificateId ? 'View Certificate' : 'Certificate'}
              </div>
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
                {student.profiles?.avatar_url ? (
                  <Image src={student.profiles.avatar_url} alt={student.profiles.name || 'User'} width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                    {(student.profiles?.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
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
