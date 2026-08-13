'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import Input, { TextArea, Select } from '@/components/ui/Input';
import { addCourse, updateCourse, deleteCourse, restoreCourse } from '@/features/admin/actions/course-actions';
import type { Course } from '@/types';
import './CourseManager.css';

interface CourseManagerProps {
  courses: Course[];
  currentUserId?: string;
  userRole?: string;
}

export default function CourseManager({ courses, currentUserId, userRole }: CourseManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState<'my_courses' | 'all_courses'>('my_courses');
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [courseFormData, setCourseFormData] = useState<Record<string, any>>({});
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/instructor') ? '/instructor' : '/admin';

  const handleCourseFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCourseFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAdd = () => {
    setEditingCourse(null);
    setCourseFormData({
      title: '',
      description: '',
      difficulty: 'sem 1',
      is_published: 'false',
      enrollment_restriction: 'any'
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseFormData({
      title: course.title || '',
      description: course.description || '',
      difficulty: course.difficulty || 'sem 1',
      is_published: course.is_published ? 'true' : 'false',
      enrollment_restriction: course.enrollment_restriction || 'any'
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this course? It will be hidden from students and instructors.')) {
      await deleteCourse(id);
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('Restore this course?')) {
      await restoreCourse(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData();
    Object.entries(courseFormData).forEach(([k, v]) => formData.append(k, String(v)));
    
    let res;
    if (editingCourse) {
      res = await updateCourse(editingCourse.id, formData);
    } else {
      res = await addCourse(formData);
    }

    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setIsModalOpen(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (c.is_deleted) return false;
    if ((courseFilter === 'my_courses' || userRole === 'instructor') && currentUserId) {
      return c.created_by === currentUserId;
    }
    return true;
  });

  const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Manage Courses</h2>
          {userRole !== 'instructor' && (
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', gap: '0.25rem' }}>
              <button 
                className={`btn-ghost ${courseFilter === 'my_courses' ? 'active' : ''}`}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.25rem', background: courseFilter === 'my_courses' ? 'var(--bg-secondary)' : 'transparent', color: courseFilter === 'my_courses' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                onClick={() => setCourseFilter('my_courses')}
              >
                My Courses
              </button>
              <button 
                className={`btn-ghost ${courseFilter === 'all_courses' ? 'active' : ''}`}
                style={{ padding: '0.375rem 0.75rem', borderRadius: '0.25rem', background: courseFilter === 'all_courses' ? 'var(--bg-secondary)' : 'transparent', color: courseFilter === 'all_courses' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                onClick={() => setCourseFilter('all_courses')}
              >
                All Courses
              </button>
            </div>
          )}
        </div>
        <Button variant="primary" onClick={openAdd}>+ Add New Course</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {filteredCourses.length === 0 ? (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <p className="text-secondary">No courses found.</p>
          </Card>
        ) : visibleCourses.map(course => (
          <Card key={course.id} variant="glass" className="course-card" style={course.is_deleted ? { opacity: 0.7, border: '1px solid var(--neon-red)' } : {}}>
            <div className="course-card-info">
              <h3 style={{ marginBottom: 'var(--space-2xs)' }}>
                {course.title}
                {course.is_deleted && <span style={{ marginLeft: 'var(--space-sm)', fontSize: '0.625rem', background: 'var(--neon-red)', color: 'white', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>DELETED</span>}
                {!course.is_published && !course.is_deleted && <span style={{ marginLeft: 'var(--space-sm)', fontSize: '0.625rem', background: 'var(--neon-gold)', color: 'black', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>DRAFT</span>}
              </h3>
              {course.profiles?.name && (
                <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-2xs)' }}>
                  Instructor: {course.profiles.name}
                </p>
              )}
              <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-xs)' }}>
                {course.lesson_count} Lessons | {course.total_xp} XP | {course.difficulty?.charAt(0).toUpperCase() + course.difficulty?.slice(1)} {course.tags?.length ? `• ${course.tags.join(', ')}` : ''}
              </p>
            </div>
            <div className="course-card-actions">
              {course.is_deleted ? (
                <Button variant="success" size="sm" onClick={() => handleRestore(course.id)} style={{ width: '100%' }}>Restore Course</Button>
              ) : (
                <>
                  <a href={`${basePath}/courses/${course.id}/builder`} className="btn btn-primary btn-build-curriculum" style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '2.5rem' }}>
                    <BookOpen size={16} /> Start Teaching
                  </a>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', width: '100%' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(course)} className="btn-edit" fullWidth>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(course.id)} className="btn-delete" fullWidth>Delete</Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {!showAllCourses && filteredCourses.length > 2 && (
        <Button variant="secondary" onClick={() => setShowAllCourses(true)} style={{ padding: '1rem', fontWeight: 'bold', width: '100%' }}>
          View all {filteredCourses.length} courses
        </Button>
      )}

      {showAllCourses && filteredCourses.length > 2 && (
        <Button variant="ghost" onClick={() => setShowAllCourses(false)} style={{ padding: '1rem', fontWeight: 'bold', width: '100%', border: '1px solid var(--glass-border)' }}>
          View Less
        </Button>
      )}

      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)'
        }}>
          <Card variant="glass" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-secondary)' }}>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>{editingCourse ? 'Edit Course' : 'Create Course'}</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {error && <div style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)' }}>{error}</div>}
              
              <Input name="title" label="Course Title" value={courseFormData.title} onChange={handleCourseFormChange} required />
              <TextArea name="description" label="Description" value={courseFormData.description} onChange={handleCourseFormChange} />
              
              <div>
                <Input 
                  name="difficulty" 
                  label="Category / Semester"
                  list="semester-options"
                  value={courseFormData.difficulty}
                  onChange={handleCourseFormChange}
                  placeholder="e.g. sem 1, AI, Skill, Web Dev" 
                  required
                />
                <datalist id="semester-options">
                  <option value="sem 1" />
                  <option value="sem 2" />
                  <option value="sem 3" />
                  <option value="sem 4" />
                  <option value="sem 5" />
                  <option value="sem 6" />
                  <option value="sem 7" />
                  <option value="sem 8" />
                </datalist>
              </div>

              <Select 
                name="is_published" 
                label="Status" 
                value={courseFormData.is_published}
                onChange={handleCourseFormChange}
                options={[
                  { value: 'false', label: 'Draft (Hidden)' },
                  { value: 'true', label: 'Published (Visible)' }
                ]}
              />

              <Select 
                name="enrollment_restriction" 
                label="Enrollment Restriction" 
                value={courseFormData.enrollment_restriction}
                onChange={handleCourseFormChange}
                options={[
                  { value: 'any', label: 'Anyone can enroll (Auto-approve)' },
                  { value: 'approval', label: 'Requires Approval' }
                ]}
              />

              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isLoading}>Save Course</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
