'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea, Select } from '@/components/ui/Input';
import { 
  addLesson, updateLesson, deleteLesson,  
  addAssignment, updateAssignment, deleteAssignment 
} from '@/features/admin/actions/builder-actions';
import { addCourseBadge, deleteCourseBadge } from '@/features/admin/actions/badge-actions';
import type { Course, Lesson, Assignment, Badge } from '@/types';
import './CurriculumBuilder.css';

interface EditingItem {
  id: string;
  title?: string;
  sort_order?: number;
  week_number?: number;
  youtube_url?: string | null;
  xp_reward?: number;
  notes?: string | null;
  type?: string;
  description?: string | null;
  expected_output?: string | null;
  requires_github?: boolean;
  requires_deploy?: boolean;
}

interface CurriculumBuilderProps {
  course: Course;
  lessons: (Lesson & { assignments: Assignment[] })[];
  courseBadges?: Badge[];
}

export default function CurriculumBuilder({ course, lessons, courseBadges = [] }: CurriculumBuilderProps) {
  const [modalType, setModalType] = useState<'lesson' | 'assignment' | 'badge' | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [parentLessonId, setParentLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Group lessons by week
  const groupedLessons = lessons.reduce((acc, lesson) => {
    const week = lesson.week_number || 1;
    if (!acc[week]) acc[week] = [];
    acc[week].push(lesson);
    return acc;
  }, {} as Record<number, typeof lessons>);

  const sortedWeeks = Object.keys(groupedLessons).map(Number).sort((a, b) => a - b);

  const openLessonModal = (lesson?: Lesson) => {
    setEditingItem(lesson || null);
    setModalType('lesson');
  };

  const openAssignmentModal = (lessonId: string, assignment?: Assignment) => {
    setParentLessonId(lessonId);
    setEditingItem(assignment || null);
    setModalType('assignment');
  };

  const openBadgeModal = () => {
    setModalType('badge');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    setParentLessonId(null);
  };

  const handleLessonSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    if (editingItem) {
      await updateLesson(editingItem.id, course.id, formData);
    } else {
      await addLesson(course.id, formData);
    }
    
    setIsLoading(false);
    closeModal();
  };

  const handleAssignmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!parentLessonId) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    if (editingItem) {
      await updateAssignment(editingItem.id, course.id, formData);
    } else {
      await addAssignment(parentLessonId, course.id, formData);
    }
    
    setIsLoading(false);
    closeModal();
  };

  const handleBadgeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await addCourseBadge(course.id, formData);
    
    setIsLoading(false);
    if (result.error) {
      alert(`Error creating badge: ${result.error}`);
    } else {
      closeModal();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="curriculum-header">
        <div className="curriculum-title-container">
          <h2 style={{ fontSize: 'var(--text-xl)' }}>{course.title} - Curriculum</h2>
          <p className="text-secondary">Drag-and-drop coming soon. For now, set the Sort Order.</p>
        </div>
        <div className="curriculum-actions">
          <Button variant="secondary" onClick={() => openBadgeModal()}>+ Add Course Badge</Button>
          <Button variant="primary" onClick={() => openLessonModal()}>+ Add Day (Lesson)</Button>
        </div>
      </div>

      {courseBadges.length > 0 && (
        <Card variant="glass" style={{ borderLeft: '4px solid var(--neon-gold)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>Course Rewards</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            {courseBadges.map(badge => (
              <div key={badge.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', background: 'var(--bg-elevated)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                <div className="badge-preview">
                  <Image src={badge.icon} alt={badge.name} width={40} height={40} style={{ objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 'var(--weight-semibold)' }}>{badge.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {badge.description} | +{badge.bonus_xp || 0} XP
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (confirm('Delete this course badge?')) await deleteCourseBadge(badge.id, course.id);
                }} style={{ color: 'var(--neon-red)', marginLeft: 'var(--space-md)' }}>Del</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {lessons.length === 0 && (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <p className="text-secondary">No lessons added yet. Start building your curriculum!</p>
          </Card>
        )}

        {sortedWeeks.map(weekNum => (
          <div key={`week-${weekNum}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--neon-gold)', marginTop: 'var(--space-md)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--glass-border)' }}>Week {weekNum}</h3>
            {groupedLessons[weekNum].map((lesson) => (
              <Card key={lesson.id} variant="glass" style={{ borderLeft: '4px solid var(--neon-cyan)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)' }}>
                      <span className="text-secondary" style={{ marginRight: '8px' }}>Day {lesson.sort_order}:</span> 
                      {lesson.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>⭐ {lesson.xp_reward} XP</span>
                      {lesson.youtube_url && <span>📺 Video Attached</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <Button variant="ghost" size="sm" onClick={() => openLessonModal(lesson as any)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={async () => {
                      if (confirm('Delete this lesson?')) await deleteLesson(lesson.id, course.id);
                    }}>Delete</Button>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Assignments</h4>
                    <Button variant="secondary" size="sm" onClick={() => openAssignmentModal(lesson.id)}>+ Add Task</Button>
                  </div>
                  
                  {lesson.assignments.length === 0 ? (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No assignments added.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {lesson.assignments.map(assign => (
                        <div key={assign.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{assign.title}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                              <span>Type: {assign.type}</span>
                              <span>| ⭐ {assign.xp_reward} XP</span>
                              {assign.requires_github && <span style={{ color: 'var(--neon-gold)' }}>| 🐙 Requires GitHub</span>}
                              {assign.requires_deploy && <span style={{ color: 'var(--neon-magenta)' }}>| 🚀 Requires Deploy</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <Button variant="ghost" size="sm" onClick={() => openAssignmentModal(lesson.id, assign)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={async () => {
                              if (confirm('Delete this task?')) await deleteAssignment(assign.id, course.id);
                            }} style={{ color: 'var(--neon-red)' }}>Del</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* MODALS */}
      {modalType && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)',
          overflowY: 'auto'
        }}>
          <Card variant="glass" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
              {editingItem ? 'Edit' : 'Add'} {modalType === 'lesson' ? 'Lesson' : modalType === 'assignment' ? 'Assignment' : 'Badge'}
            </h2>
            
            {modalType === 'lesson' && (
              <form onSubmit={handleLessonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Input 
                  name="title" 
                  label="Lesson Title" 
                  defaultValue={editingItem ? editingItem.title : (lessons.length > 0 ? lessons[lessons.length - 1].title : '')} 
                  required 
                />
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <div style={{ flex: 1 }}>
                    <Input name="week_number" type="number" label="Week Number" defaultValue={editingItem?.week_number || 1} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Input name="sort_order" type="number" label="Day Number (Sort Order)" defaultValue={editingItem?.sort_order || lessons.length + 1} required />
                  </div>
                </div>
                <Input name="youtube_url" label="YouTube URL (Optional)" defaultValue={editingItem?.youtube_url || undefined} />
                <Input name="xp_reward" type="number" label="XP Reward for reading" defaultValue={editingItem?.xp_reward || 20} required />
                <TextArea name="notes" label="Lesson Content" defaultValue={editingItem?.notes || undefined} style={{ minHeight: '150px' }} />
                
                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isLoading}>Save Lesson</Button>
                </div>
              </form>
            )}

            {modalType === 'assignment' && (
              <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Input name="title" label="Assignment Title" defaultValue={editingItem?.title} required />
                <Select 
                  name="type" 
                  label="Submission Type" 
                  defaultValue={editingItem?.type || 'code'}
                  options={[
                    { value: 'code', label: 'Code Snippet' },
                    { value: 'github', label: 'GitHub Repository Link' },
                    { value: 'deploy', label: 'Live Deployment URL' },
                    { value: 'ui', label: 'Screenshot / UI Image' }
                  ]}
                />
                <Input name="xp_reward" type="number" label="XP Reward upon approval" defaultValue={editingItem?.xp_reward || 50} required />
                <TextArea name="description" label="Instructions" defaultValue={editingItem?.description || undefined} />
                <TextArea name="expected_output" label="Expected Output (For Grader)" defaultValue={editingItem?.expected_output || undefined} />
                
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <Select 
                    name="requires_github" 
                    label="Requires GitHub Link?" 
                    defaultValue={editingItem?.requires_github ? 'true' : 'false'}
                    options={[ { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' } ]}
                  />
                  <Select 
                    name="requires_deploy" 
                    label="Requires Live URL?" 
                    defaultValue={editingItem?.requires_deploy ? 'true' : 'false'}
                    options={[ { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' } ]}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isLoading}>Save Assignment</Button>
                </div>
              </form>
            )}

            {modalType === 'badge' && (
              <form onSubmit={handleBadgeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <Input name="name" label="Badge Name" placeholder="e.g. React Master" required />
                <TextArea name="description" label="Condition / Task Description" placeholder="e.g. Complete 100% of the React course" required />
                <Input name="bonus_xp" type="number" label="Bonus XP" defaultValue={100} required />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Badge Icon Image</label>
                  <input 
                    type="file" 
                    name="icon_file" 
                    accept="image/*" 
                    required
                    disabled={isLoading}
                    style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Upload a transparent PNG for best results.</p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary" isLoading={isLoading}>Create Badge</Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
