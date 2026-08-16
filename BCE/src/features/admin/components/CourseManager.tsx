'use client';

import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import Input, { TextArea, Select } from '@/components/ui/Input';
import { addCourse, updateCourse, deleteCourse, restoreCourse } from '@/features/admin/actions/course-actions';
import type { Course } from '@/types';
import './CourseManager.css';

interface CourseManagerProps {
  courses: any[];
  instructors: any[];
  currentUserId?: string;
  userRole?: string;
}

function MultiSelectFacultyDropdown({
  instructors,
  selectedIds,
  onChange,
}: {
  instructors: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredInstructors = instructors.filter((inst) => {
    const name = (inst.full_name || inst.name || inst.email || '').toLowerCase();
    const role = (inst.role || '').toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || role.includes(query);
  });

  const selectedInstructors = instructors.filter((inst) => selectedIds.includes(inst.id));

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(instructors.map((i) => i.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Dropdown Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '42px',
          padding: '0.5rem 0.875rem',
          background: 'var(--bg-input)',
          border: isOpen ? '1px solid var(--accent-primary, #6366f1)' : '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center', flex: 1 }}>
          {selectedInstructors.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              -- Click to Select Multiple Faculty / Admin --
            </span>
          ) : (
            selectedInstructors.map((inst) => (
              <span
                key={inst.id}
                style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500
                }}
              >
                {inst.full_name || inst.name || inst.email}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(inst.id);
                  }}
                  style={{
                    cursor: 'pointer',
                    fontSize: '12px',
                    lineHeight: 1,
                    opacity: 0.7,
                    marginLeft: '2px'
                  }}
                  title="Remove"
                >
                  ✕
                </span>
              </span>
            ))
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1100,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '240px'
          }}
        >
          {/* Header Controls */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-input)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="🔍 Search faculty or admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '0.375rem 0.625rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0 2px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {selectedIds.length} of {instructors.length} selected
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #6366f1)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* List Options */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
            {filteredInstructors.length === 0 ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No faculty or admin found.
              </div>
            ) : (
              filteredInstructors.map((inst) => {
                const isSelected = selectedIds.includes(inst.id);
                return (
                  <div
                    key={inst.id}
                    onClick={() => toggleSelect(inst.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: isSelected ? 600 : 400 }}>
                        {inst.full_name || inst.name || inst.email}
                      </span>
                      {inst.role && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Role: {inst.role}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span style={{ color: 'var(--accent-primary, #6366f1)', fontSize: '0.85rem', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseManager({ courses, instructors = [], currentUserId, userRole }: CourseManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState<'my_courses' | 'all_courses'>('my_courses');
  const [showAllCourses, setShowAllCourses] = useState(true);
  const [courseFormData, setCourseFormData] = useState<Record<string, any>>({});
  const [facultySelectionType, setFacultySelectionType] = useState<'single' | 'multiple'>('single');
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/instructor') ? '/instructor' : '/admin';

  const handleCourseFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setCourseFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openAdd = () => {
    setEditingCourse(null);
    setFacultySelectionType('single');
    setCourseFormData({
      title: '',
      description: '',
      difficulty: 'sem 1',
      is_published: 'false',
      enrollment_restriction: 'any',
      instructor_ids: currentUserId ? [currentUserId] : []
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (course: any) => {
    setEditingCourse(course);
    const existingInstructorIds = (course.course_instructors || []).map((ci: any) => ci.instructor_id);
    setFacultySelectionType(existingInstructorIds.length > 1 ? 'multiple' : 'single');
    setCourseFormData({
      title: course.title || '',
      description: course.description || '',
      difficulty: course.difficulty || 'sem 1',
      is_published: course.is_published ? 'true' : 'false',
      enrollment_restriction: course.enrollment_restriction || 'any',
      instructor_ids: existingInstructorIds
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
    Object.entries(courseFormData).forEach(([k, v]) => {
      if (k === 'instructor_ids') {
        formData.append(k, JSON.stringify(v));
      } else {
        formData.append(k, String(v));
      }
    });
    
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
    if (courseFilter === 'my_courses' && currentUserId) {
      const isAssigned = c.course_instructors?.some((ci: any) => ci.instructor_id === currentUserId);
      return c.created_by === currentUserId || isAssigned;
    }
    return true;
  });

  const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Manage Courses</h2>
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
              {(course.course_instructors && course.course_instructors.length > 0) ? (
                <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-2xs)' }}>
                  Instructors: {course.course_instructors.map((ci: any) => {
                    const inst = instructors.find((i: any) => i.id === ci.instructor_id);
                    return inst ? (inst.full_name || inst.name) : null;
                  }).filter(Boolean).join(', ') || 'No instructors'}
                </p>
              ) : course.profiles?.name ? (
                <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-2xs)' }}>
                  Instructor: {course.profiles.name}
                </p>
              ) : null}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Instructors / Faculty</label>
                  <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', gap: '0.2rem', border: '1px solid var(--glass-border)' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '0.2rem',
                        background: facultySelectionType === 'single' ? 'var(--accent-primary, #6366f1)' : 'transparent',
                        color: facultySelectionType === 'single' ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setFacultySelectionType('single');
                        const currentIds = courseFormData.instructor_ids || [];
                        setCourseFormData(prev => ({
                          ...prev,
                          instructor_ids: currentIds.length > 0 ? [currentIds[0]] : (currentUserId ? [currentUserId] : [])
                        }));
                      }}
                    >
                      Single Faculty
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '0.2rem',
                        background: facultySelectionType === 'multiple' ? 'var(--accent-primary, #6366f1)' : 'transparent',
                        color: facultySelectionType === 'multiple' ? '#ffffff' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setFacultySelectionType('multiple')}
                    >
                      Multiple Faculty
                    </button>
                  </div>
                </div>

                {facultySelectionType === 'single' ? (
                  <select
                    className="input-field select-field"
                    value={courseFormData.instructor_ids?.[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCourseFormData(prev => ({
                        ...prev,
                        instructor_ids: val ? [val] : []
                      }));
                    }}
                    style={{ width: '100%', padding: '0.625rem 0.875rem' }}
                  >
                    <option value="">-- Select Faculty / Admin --</option>
                    {instructors.map((inst: any) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.full_name || inst.name || inst.email} ({inst.role || 'faculty'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <MultiSelectFacultyDropdown
                    instructors={instructors}
                    selectedIds={courseFormData.instructor_ids || []}
                    onChange={(ids) => setCourseFormData(prev => ({ ...prev, instructor_ids: ids }))}
                  />
                )}
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
