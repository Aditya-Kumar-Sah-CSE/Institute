'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea, Select } from '@/components/ui/Input';
import { 
  addLesson, updateLesson, deleteLesson,
  addAssignment, updateAssignment, deleteAssignment 
} from '@/features/admin/actions/builder-actions';
import { reviewSubmissionAction } from '@/features/admin/actions/submissions';
import { completeCourseAndIssueCertificates } from '@/features/courses/actions/certificates';
import type { Course, Lesson, Assignment, Badge } from '@/types';
import CreatePollWidget from '@/features/courses/components/CreatePollWidget';
import { parseAttachmentUrls } from '@/lib/attachments';
import { Edit, Trash2 } from 'lucide-react';
import './CurriculumBuilder.css';

interface EditingItem {
  id: string;
  title?: string;
  sort_order?: number;
  week_number?: number;
  youtube_url?: string | null;
  xp_reward?: number;
  notes?: string | null;
  pdf_url?: string | null;
  type?: string;
  description?: string | null;
  expected_output?: string | null;
  requires_github?: boolean;
  requires_deploy?: boolean;
}

interface CurriculumBuilderProps {
  course: Course;
  lessons: (Lesson & { assignments: Assignment[] })[];
  submissions?: any[];
}

export default function CurriculumBuilder({ course, lessons, submissions = [] }: CurriculumBuilderProps) {
  const [modalType, setModalType] = useState<'lesson' | 'assignment' | 'submission' | 'complete_course' | 'preview' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [parentLessonId, setParentLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState<any>(null);
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({});
  const [isCompletingCourse, setIsCompletingCourse] = useState(false);
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [lessonFormData, setLessonFormData] = useState<Record<string, any>>({});
  const [assignmentFormData, setAssignmentFormData] = useState<Record<string, any>>({});

  const handleLessonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'file') {
      setLessonFormData(prev => ({ ...prev, [target.name]: target.files }));
    } else {
      setLessonFormData(prev => ({ ...prev, [target.name]: target.value }));
    }
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'file') {
      setAssignmentFormData(prev => ({ ...prev, [target.name]: target.files }));
    } else if (target.type === 'checkbox') {
      setAssignmentFormData(prev => ({ ...prev, [target.name]: (target as HTMLInputElement).checked }));
    } else {
      setAssignmentFormData(prev => ({ ...prev, [target.name]: target.value }));
    }
  };

  // Group lessons by date
  const groupedLessons = lessons.reduce((acc, lesson) => {
    const dateStr = new Date(lesson.created_at || Date.now()).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(lesson);
    return acc;
  }, {} as Record<string, typeof lessons>);

  const sortedGroups = Object.keys(groupedLessons).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const visibleGroups = showAllLessons ? sortedGroups : sortedGroups.slice(0, 1);

  const openLessonModal = (lesson?: Lesson) => {
    setEditingItem(lesson || null);
    setLessonFormData({
      title: lesson?.title || '',
      youtube_url: lesson?.youtube_url || '',
      xp_reward: lesson?.xp_reward || 20,
      notes: lesson?.notes || '',
    });
    setModalType('lesson');
  };

  const openAssignmentModal = (lessonId: string, assignment?: Assignment) => {
    setParentLessonId(lessonId);
    setEditingItem(assignment || null);
    setAssignmentFormData({
      title: assignment?.title || '',
      type: assignment?.type || 'ui',
      xp_reward: assignment?.xp_reward || 50,
      description: assignment?.description || '',
      requires_github: assignment?.requires_github ? 'true' : 'false',
      requires_deploy: assignment?.requires_deploy ? 'true' : 'false'
    });
    setModalType('assignment');
  };

  const openPreviewModal = (url: string) => {
    setPreviewUrl(url);
    setModalType('preview');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setParentLessonId(null);
    setReviewingSubmission(null);
    setPreviewUrl(null);
  };

  const handleLessonSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(lessonFormData).forEach(([k, v]) => {
      if (k === 'pdf_file' && v instanceof FileList) {
        Array.from(v).forEach(file => formData.append(k, file));
      } else if (v !== undefined && v !== null && v !== '') {
        formData.append(k, v);
      }
    });
    
    let res;
    if (editingItem) {
      res = await updateLesson(editingItem.id, course.id, formData);
    } else {
      res = await addLesson(course.id, formData);
    }
    
    if (res && res.error) {
      alert(res.error);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(false);
    closeModal();
  };

  const handleAssignmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!parentLessonId) return;

    setIsLoading(true);
    const formData = new FormData();
    Object.entries(assignmentFormData).forEach(([k, v]) => {
      if (k === 'expected_output_file' && v instanceof FileList) {
        Array.from(v).forEach(file => formData.append(k, file));
      } else if (v !== undefined && v !== null && v !== '') {
        formData.append(k, String(v));
      }
    });
    
    if (editingItem) {
      await updateAssignment(editingItem.id, course.id, formData);
    } else {
      await addAssignment(parentLessonId, course.id, formData);
    }
    
    setIsLoading(false);
    closeModal();
  };

  const handleReviewSubmit = async (formData: FormData) => {
    setIsLoading(true);
    const res = await reviewSubmissionAction(formData);
    setIsLoading(false);
    if (res?.error) {
      alert(res.error);
    } else {
      // Update local state to reflect the change immediately
      const action = formData.get('action');
      const feedback = formData.get('feedback');
      if (reviewingSubmission) {
        reviewingSubmission.status = action === 'approve' ? 'approved' : 'rejected';
        reviewingSubmission.feedback = feedback;
      }
      closeModal();
    }
  };

  const executeCompleteCourse = async () => {
    setIsCompletingCourse(true);
    const res = await completeCourseAndIssueCertificates(course.id);
    setIsCompletingCourse(false);
    if (res.error) {
      alert(res.error);
    } else {
      setModalType(null);
      // Optional: you can show a success toast here if you have one, or just let it update visually
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="curriculum-header">
        <div className="curriculum-title-container">
          <h2 style={{ fontSize: 'var(--text-xl)' }}>{course.title} - Curriculum {course.is_completed && <span style={{ padding: '2px 8px', background: 'var(--neon-gold)', color: '#000', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', marginLeft: '10px' }}>COMPLETED</span>}</h2>
          <p className="text-secondary">Lessons are automatically grouped by date.</p>
        </div>
      </div>

      {/* INSTRUCTOR COURSE POLL PANEL */}
      {!course.is_completed && (
        <div style={{ padding: 'var(--space-lg)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="section-title" style={{ margin: '0 0 var(--space-md) 0' }}>Course Polls</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: 'var(--space-sm)' }}>
            <Link href={`/courses/${course.id}`} style={{ textDecoration: 'none', flexShrink: 1, overflow: 'hidden' }}>
              <Button variant="success" size="sm" style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 'var(--weight-bold)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>
                View Polls & Doubts
              </Button>
            </Link>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <CreatePollWidget courseId={course.id} hideHeading={true} />
            </div>
          </div>
        </div>
      )}
      </div>

      {!course.is_completed && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-md)' }}>
          <Button variant="ghost" onClick={() => setModalType('complete_course')} isLoading={isCompletingCourse} style={{ color: 'var(--neon-gold)', border: '1px solid var(--neon-gold)', padding: '12px 24px', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>Issue Certificate</Button>
          <Button variant="primary" onClick={() => openLessonModal()} style={{ padding: '12px 24px', fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>+ Add Day (Lesson)</Button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {lessons.length === 0 && (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <p className="text-secondary">No lessons added yet. Start building your curriculum!</p>
          </Card>
        )}

        {visibleGroups.map(dateStr => (
          <div key={`date-${dateStr}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--neon-gold)', marginTop: 'var(--space-md)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--glass-border)' }}>{dateStr}</h3>
            {groupedLessons[dateStr].map((lesson) => (
              <Card key={lesson.id} variant="glass" style={{ borderLeft: '4px solid var(--neon-cyan)' }}>
                <div className="lesson-header-row" style={{ marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'inherit' }}>
                        {lesson.title}
                      </span>
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>⭐ {lesson.xp_reward} XP</span>
                      {lesson.youtube_url && <span>🔗 Link Attached</span>}
                    </div>
                  </div>
                  {!course.is_completed && (
                    <div className="action-buttons">
                      <Button variant="ghost" size="sm" onClick={() => openLessonModal(lesson as any)} style={{ padding: '8px' }} title="Edit Lesson">
                        <Edit size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={async () => {
                        if (confirm('Delete this lesson?')) await deleteLesson(lesson.id, course.id);
                      }} style={{ padding: '8px' }} title="Delete Lesson">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── Inline Content Preview Cards ── */}
                {(lesson.youtube_url || lesson.pdf_url) && (() => {
                  const pdfUrls = parseAttachmentUrls(lesson.pdf_url);
                  const ytMatch = lesson.youtube_url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
                  const ytThumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` : null;
                  const isYouTube = !!ytMatch;

                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: 'var(--space-md)' }}>
                      {/* External Link Card */}
                      {lesson.youtube_url && (
                        <a
                          href={lesson.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cb-preview-card"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            color: 'inherit',
                            maxWidth: '320px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--neon-cyan)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                          {ytThumb ? (
                            <img
                              src={ytThumb}
                              alt="Video thumbnail"
                              style={{ width: 56, height: 42, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(0,191,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>🔗</div>
                          )}
                          <div style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: isYouTube ? '#ff4444' : 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {isYouTube ? '▶ YouTube Video' : '🔗 External Link'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lesson.youtube_url}
                            </div>
                          </div>
                        </a>
                      )}

                      {/* PDF / Image Attachment Cards */}
                      {pdfUrls.map((url, idx) => {
                        const isPdf = url.toLowerCase().includes('.pdf');
                        const isImg = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url);
                        const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `File ${idx + 1}`);
                        // Shorten UUID filenames
                        const shortName = fileName.length > 30 ? fileName.slice(0, 12) + '…' + fileName.slice(-12) : fileName;

                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cb-preview-card"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px',
                              textDecoration: 'none',
                              color: 'inherit',
                              maxWidth: isImg ? '140px' : '260px',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--neon-magenta)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                          >
                            {isImg ? (
                              <img src={url} alt={`Attachment ${idx + 1}`} style={{ width: 48, height: 48, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: '8px', background: isPdf ? 'rgba(255,59,48,0.12)' : 'rgba(255,204,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                                {isPdf ? '📄' : '📎'}
                              </div>
                            )}
                            <div style={{ overflow: 'hidden', minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: isPdf ? '#ff6b6b' : 'var(--neon-gold)' }}>
                                {isPdf ? 'PDF Notes' : isImg ? 'Image' : 'Attachment'}
                              </div>
                              {!isImg && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {shortName}
                                </div>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  );
                })()}

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Assignments</h4>
                    {!course.is_completed && <Button variant="primary" size="md" style={{ padding: '8px 20px', fontWeight: 'bold', fontSize: '0.95rem' }} onClick={() => openAssignmentModal(lesson.id)}>+ Add Task</Button>}
                  </div>
                  
                  {lesson.assignments.length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No assignments added.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {lesson.assignments.map(assign => {
                        const assignSubmissions = submissions.filter(s => s.assignment_id === assign.id);
                        const isExpanded = expandedAssignments[assign.id];
                        const visibleSubmissions = isExpanded ? assignSubmissions : assignSubmissions.slice(0, 3);
                        const remainingCount = assignSubmissions.length - 3;

                        return (
                          <div key={assign.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div className="assignment-header-row" style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(178,102,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                                  📝
                                </div>
                                <div>
                                  <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-cyan)' }}>
                                    <span>
                                      {assign.title}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', gap: '8px', marginTop: '2px' }}>
                                    <span>Type: {assign.type}</span>
                                    <span>| ⭐ {assign.xp_reward} XP</span>
                                    {assign.requires_github && <span style={{ color: 'var(--neon-gold)' }}>| 🐙 GitHub</span>}
                                    {assign.requires_deploy && <span style={{ color: 'var(--neon-magenta)' }}>| 🚀 Deploy</span>}
                                  </div>
                                </div>
                              </div>
                              {!course.is_completed && (
                                <div className="action-buttons">
                                  <Button variant="ghost" size="sm" onClick={() => openAssignmentModal(lesson.id, assign)} style={{ padding: '8px' }} title="Edit Task">
                                    <Edit size={16} />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={async () => {
                                    if (confirm('Delete this task?')) await deleteAssignment(assign.id, course.id);
                                  }} style={{ color: 'var(--neon-red)', padding: '8px' }} title="Delete Task">
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {/* Student Submissions Section */}
                            {assignSubmissions.length > 0 && (
                              <div style={{ padding: '0 var(--space-sm) var(--space-sm) var(--space-sm)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 'var(--space-xs) 0' }}>Submissions ({assignSubmissions.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                                  {visibleSubmissions.map(sub => (
                                    <div key={sub.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => {
                                      if (sub.status === 'approved' || sub.status === 'rejected' || sub.status === 'pending') {
                                        // Open the review modal
                                        setReviewingSubmission({ ...sub, assignment: assign });
                                        setModalType('submission');
                                      }
                                    }}>
                                      {sub.profiles?.avatar_url ? (
                                        <img src={sub.profiles.avatar_url} alt={sub.profiles.name} title={sub.profiles.name} style={{ width: 24, height: 24, borderRadius: '50%', border: sub.status === 'approved' ? '2px solid var(--neon-lime)' : '2px solid var(--text-muted)', objectFit: 'cover' }} />
                                      ) : (
                                        <div title={sub.profiles?.name} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#000', fontWeight: 'bold', border: sub.status === 'approved' ? '2px solid var(--neon-lime)' : '2px solid transparent' }}>
                                          {sub.profiles?.name?.[0] || '?'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  
                                  {!isExpanded && remainingCount > 0 && (
                                    <div 
                                      title="View all"
                                      onClick={() => setExpandedAssignments(prev => ({ ...prev, [assign.id]: true }))}
                                      style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      +{remainingCount}
                                    </div>
                                  )}
                                  
                                  {isExpanded && remainingCount > 0 && (
                                    <div 
                                      title="Show less"
                                      onClick={() => setExpandedAssignments(prev => ({ ...prev, [assign.id]: false }))}
                                      style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      -
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}

        {!showAllLessons && sortedGroups.length > 1 && (
          <Button variant="secondary" onClick={() => setShowAllLessons(true)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%' }}>
            View all {lessons.length} lessons
          </Button>
        )}

        {showAllLessons && sortedGroups.length > 1 && (
          <Button variant="ghost" onClick={() => setShowAllLessons(false)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%', border: '1px solid var(--glass-border)' }}>
            View Less
          </Button>
        )}
      </div>

      {/* MODALS */}
      {modalType && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)',
          overflowY: 'auto'
        }}>
          <Card variant="glass" style={{ width: '100%', maxWidth: modalType === 'preview' ? '1200px' : '600px', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
            {modalType !== 'complete_course' && modalType !== 'preview' && (
              <h2 style={{ marginBottom: 'var(--space-lg)' }}>
                {modalType === 'submission' ? 'Review Submission' : editingItem ? 'Edit ' + (modalType === 'lesson' ? 'Lesson' : 'Assignment') : 'Add ' + (modalType === 'lesson' ? 'Lesson' : 'Assignment')}
              </h2>
            )}
            
            {modalType === 'lesson' && (
              <form onSubmit={handleLessonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Input 
                  name="title" 
                  label="Lesson Title" 
                  value={lessonFormData.title || ''} 
                  onChange={handleLessonChange}
                  required 
                />
                <Input name="youtube_url" label="External Link (YouTube, Blog, Forms, etc.) (Optional)" value={lessonFormData.youtube_url || ''} onChange={handleLessonChange} />
                <Input name="xp_reward" type="number" label="XP Reward for reading" value={lessonFormData.xp_reward || ''} onChange={handleLessonChange} required />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>PDF / Image Notes (Optional)</label>
                  {editingItem?.pdf_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <a href={editingItem.pdf_url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)' }}>View Current Attachment</a>
                      <label style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          name="clear_attachment" 
                          checked={!!lessonFormData.clear_attachment}
                          onChange={(e) => setLessonFormData(prev => ({ ...prev, clear_attachment: e.target.checked }))}
                        />
                        Remove attachment
                      </label>
                    </div>
                  )}
                  <input 
                    type="file" 
                    name="pdf_file" 
                    onChange={handleLessonChange}
                    accept="application/pdf,image/*" 
                    multiple
                    disabled={isLoading}
                    style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Upload PDF or Image notes for this lesson.</p>
                </div>

                {editingItem && (
                  <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-xs)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', color: '#ff453a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        name="clear_content" 
                        checked={!!lessonFormData.clear_content}
                        onChange={(e) => setLessonFormData(prev => ({ 
                          ...prev, 
                          clear_content: e.target.checked,
                          notes: e.target.checked ? '' : prev.notes,
                          youtube_url: e.target.checked ? '' : prev.youtube_url,
                        }))}
                      />
                      Delete completely lesson content (Notes, Link & Attachments)
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isLoading}>Save Lesson</Button>
                </div>
              </form>
            )}

            {modalType === 'assignment' && (
              <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Input name="title" label="Assignment Title" value={assignmentFormData.title || ''} onChange={handleAssignmentChange} required />
                
                <TextArea name="description" label="Instructions (Optional)" value={assignmentFormData.description || ''} onChange={handleAssignmentChange} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Image or PDF (Optional)</label>
                  {editingItem?.expected_output && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <a href={editingItem.expected_output} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)' }}>View Current Attachment</a>
                      <label style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          name="clear_attachment" 
                          checked={!!assignmentFormData.clear_attachment}
                          onChange={(e) => setAssignmentFormData(prev => ({ ...prev, clear_attachment: e.target.checked }))}
                        />
                        Remove attachment
                      </label>
                    </div>
                  )}
                  <input 
                    type="file" 
                    name="expected_output_file" 
                    onChange={handleAssignmentChange}
                    accept="application/pdf,image/*" 
                    multiple
                    disabled={isLoading}
                    style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Upload expected output image or PDF for reference.</p>
                </div>

                <Select 
                  name="type" 
                  label="Submission Type" 
                  value={assignmentFormData.type || ''}
                  onChange={handleAssignmentChange}
                  options={[
                    { value: 'code', label: 'Code Snippet' },
                    { value: 'github', label: 'GitHub Repository Link' },
                    { value: 'deploy', label: 'Live Deployment URL' },
                    { value: 'ui', label: 'Screenshot / UI Image' },
                    { value: 'any', label: 'Any (All inputs enabled)' }
                  ]}
                />

                <Input name="xp_reward" type="number" label="XP Reward upon approval" value={assignmentFormData.xp_reward || ''} onChange={handleAssignmentChange} required />
                
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <Select 
                    name="requires_github" 
                    label="Ask for GitHub Link?" 
                    value={assignmentFormData.requires_github || ''}
                    onChange={handleAssignmentChange}
                    options={[ { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' } ]}
                  />
                  <Select 
                    name="requires_deploy" 
                    label="Ask for Live URL?" 
                    value={assignmentFormData.requires_deploy || ''}
                    onChange={handleAssignmentChange}
                    options={[ { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' } ]}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isLoading}>Save Assignment</Button>
                </div>
              </form>
            )}

            {modalType === 'submission' && reviewingSubmission && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{reviewingSubmission.assignment.title}</h3>
                    <p className="text-secondary text-sm">By {reviewingSubmission.profiles?.name}</p>
                  </div>
                  <div className="text-gradient" style={{ fontWeight: 'bold' }}>
                    +{reviewingSubmission.assignment.xp_reward} XP
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
                  <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)', textTransform: 'uppercase' }}>Submission Data</div>
                  {!reviewingSubmission.github_link && !reviewingSubmission.deploy_link && !reviewingSubmission.answer && (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No submission data provided.
                    </div>
                  )}
                  {reviewingSubmission.github_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>GitHub:</strong> <a href={reviewingSubmission.github_link} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{reviewingSubmission.github_link}</a></div>}
                  {reviewingSubmission.deploy_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>Deploy:</strong> <a href={reviewingSubmission.deploy_link} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{reviewingSubmission.deploy_link}</a></div>}
                  {reviewingSubmission.answer && (
                    <div>
                      <strong>Answer:</strong> 
                      {reviewingSubmission.assignment.type === 'ui' ? (
                        <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                          {(() => {
                            let urls: string[] = [];
                            try {
                              const parsed = typeof reviewingSubmission.answer === 'string' ? JSON.parse(reviewingSubmission.answer) : reviewingSubmission.answer;
                              urls = Array.isArray(parsed) ? parsed : [String(reviewingSubmission.answer)];
                            } catch {
                              urls = [String(reviewingSubmission.answer)];
                            }
                            return urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: '#000', background: 'var(--neon-cyan)', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                                📄 View File {idx + 1}
                              </a>
                            ));
                          })()}
                        </div>
                      ) : (
                        <pre style={{ background: 'var(--bg-input)', padding: 'var(--space-sm)', marginTop: 'var(--space-xs)', overflowX: 'auto', whiteSpace: 'pre-wrap', borderRadius: 'var(--radius-sm)' }}>
                          {typeof reviewingSubmission.answer === 'string' ? reviewingSubmission.answer : JSON.stringify(reviewingSubmission.answer, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>

                <form action={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <input type="hidden" name="submissionId" value={reviewingSubmission.id} />
                  <textarea 
                    name="feedback" 
                    placeholder="Optional feedback..." 
                    defaultValue={reviewingSubmission.feedback || ''}
                    style={{ width: '100%', padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
                  />
                  {reviewingSubmission.status === 'approved' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                      <span style={{ color: 'var(--neon-lime)', fontWeight: 'bold' }}>✅ Approved</span>
                      <Button type="button" variant="ghost" onClick={closeModal}>Close</Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-sm)' }}>
                      <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                      <Button type="submit" name="action" value="reject" variant="danger" size="sm" isLoading={isLoading} confirmMessage="Reject this assignment?">Reject / Needs Work</Button>
                      <Button type="submit" name="action" value="approve" variant="success" size="sm" isLoading={isLoading} confirmMessage="Approve this assignment?">Approve & Award XP</Button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {modalType === 'complete_course' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--neon-gold)' }}>Course Completed</h3>
                <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                  Are you sure you want to mark this course as completed? This will lock the curriculum and generate certificates for all enrolled students. <strong>This action cannot be undone.</strong>
                </p>
                <div style={{ marginTop: 'var(--space-xs)' }}>
                  <Link href={`/certificates/dummy?courseId=${course.id}`} target="_blank" style={{ color: 'var(--neon-gold)', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    📜 Preview Certificate Template ↗
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal} disabled={isCompletingCourse}>Cancel</Button>
                  <Button type="button" variant="primary" onClick={executeCompleteCourse} isLoading={isCompletingCourse} style={{ background: 'var(--neon-gold)', color: '#000', borderColor: 'var(--neon-gold)' }}>Yes, Issue Certificates</Button>
                </div>
              </div>
            )}
            {modalType === 'preview' && previewUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>Live Preview</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <a href={previewUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', textDecoration: 'none', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', border: '1px solid var(--glass-border)' }}>
                      Open in New Tab ↗
                    </a>
                    <Button variant="ghost" onClick={closeModal}>Close Preview</Button>
                  </div>
                </div>
                <div style={{ flex: 1, background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Live Preview" />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
