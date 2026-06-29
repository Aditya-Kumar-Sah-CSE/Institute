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
}

export default function CurriculumBuilder({ course, lessons }: CurriculumBuilderProps) {
  const [modalType, setModalType] = useState<'lesson' | 'assignment' | null>(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="curriculum-header">
        <div className="curriculum-title-container">
          <h2 style={{ fontSize: 'var(--text-xl)' }}>{course.title} - Curriculum</h2>
          <p className="text-secondary">Drag-and-drop coming soon. For now, set the Sort Order.</p>
        </div>
        <div className="curriculum-actions">
          <Button variant="primary" onClick={() => openLessonModal()}>+ Add Day (Lesson)</Button>
        </div>
      </div>

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
              {editingItem ? 'Edit' : 'Add'} {modalType === 'lesson' ? 'Lesson' : 'Assignment'}
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>PDF / Image Notes (Optional)</label>
                  {editingItem?.pdf_url && (
                    <div style={{ marginBottom: '8px' }}>
                      <a href={editingItem.pdf_url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)' }}>View Current Attachment</a>
                    </div>
                  )}
                  <input 
                    type="file" 
                    name="pdf_file" 
                    accept="application/pdf,image/*" 
                    disabled={isLoading}
                    style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Upload PDF or Image notes for this lesson.</p>
                </div>

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
          </Card>
        </div>
      )}
    </div>
  );
}
