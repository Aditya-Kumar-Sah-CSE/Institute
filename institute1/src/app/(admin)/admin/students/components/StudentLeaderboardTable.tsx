'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LevelBadge from '@/components/shared/LevelBadge';
import { formatDistanceToNow } from 'date-fns';
import { deleteStudent, deleteEnrollment } from '@/features/admin/actions/adminActions';
import type { LevelName } from '@/types';

interface EnrollmentDetail {
  id: string;
  progress: number;
  status: string;
  course_id: string;
  courses: {
    title: string;
  } | null;
}

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  institute_id?: string | null;
  xp: number;
  level: LevelName;
  created_at: string;
  last_active_at: string | null;
  role: string;
  status: string;
  enrollments: EnrollmentDetail[] | null;
}

interface StudentLeaderboardTableProps {
  students: StudentDetail[];
  isInstructor: boolean;
}

import './StudentLeaderboardTable.css';

export default function StudentLeaderboardTable({ students, isInstructor }: StudentLeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search and Role filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || student.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete student "${studentName}"? This will remove all their progress, submissions, and XP. This action cannot be undone.`)) {
      startTransition(async () => {
        try {
          const result = await deleteStudent(studentId);
          if (result.error) {
            alert(`Error deleting student: ${result.error}`);
          } else {
            setSelectedStudent(null);
          }
        } catch (err) {
          console.error(err);
          alert('An unexpected error occurred.');
        }
      });
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string, courseTitle: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to remove "${studentName}" from the course "${courseTitle}"? This will delete all their progress inside this course.`)) {
      startTransition(async () => {
        try {
          const result = await deleteEnrollment(enrollmentId);
          if (result.error) {
            alert(`Error deleting enrollment: ${result.error}`);
          } else {
            // Update selected student enrollments locally so modal updates instantly
            if (selectedStudent) {
              const updatedEnrollments = selectedStudent.enrollments?.filter(e => e.id !== enrollmentId) || [];
              setSelectedStudent({
                ...selectedStudent,
                enrollments: updatedEnrollments
              });
            }
          }
        } catch (err) {
          console.error(err);
          alert('An unexpected error occurred.');
        }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Search Input */}
      <div className="search-container" style={{ marginBottom: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <Input 
            placeholder="Search users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="🔍"
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <Button 
            variant={roleFilter === 'all' ? 'primary' : 'secondary'} 
            onClick={() => setRoleFilter('all')}
            size="sm"
          >
            All Members
          </Button>
          <Button 
            variant={roleFilter === 'student' ? 'primary' : 'secondary'} 
            onClick={() => setRoleFilter('student')}
            size="sm"
          >
            Students
          </Button>
          <Button 
            variant={roleFilter === 'instructor' ? 'primary' : 'secondary'} 
            onClick={() => setRoleFilter('instructor')}
            size="sm"
          >
            Faculty
          </Button>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Name & Role</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Email</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Level</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>XP</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Overall Progress</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Last Active</th>
              <th style={{ padding: 'var(--space-md) var(--space-sm)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map(student => {
              let studentProgress = 0;
              if (student.enrollments && student.enrollments.length > 0) {
                const sum = student.enrollments.reduce((acc: number, curr: EnrollmentDetail) => acc + (curr.progress || 0), 0);
                studentProgress = sum / student.enrollments.length;
              }

              return (
                <tr 
                  key={student.id} 
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  className="leaderboard-row"
                  onClick={() => setSelectedStudent(student)}
                >
                  <td data-label="Name" style={{ padding: 'var(--space-md) var(--space-sm)', fontWeight: 'var(--weight-semibold)' }}>
                    <div className="td-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="hover-underline" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        marginTop: '4px',
                        background: student.role === 'instructor' ? 'rgba(255, 165, 2, 0.2)' : 'rgba(46, 213, 115, 0.2)',
                        color: student.role === 'instructor' ? '#ffa502' : '#2ed573',
                        textTransform: 'uppercase'
                      }}>
                        {student.role}
                      </span>
                    </div>
                  </td>
                  <td data-label="Email" style={{ padding: 'var(--space-md) var(--space-sm)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    <div className="td-content" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.email}
                    </div>
                  </td>
                  <td data-label="Level" style={{ padding: 'var(--space-md) var(--space-sm)' }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-content">
                      <LevelBadge level={student.level} size="sm" />
                    </div>
                  </td>
                  <td data-label="XP" style={{ padding: 'var(--space-md) var(--space-sm)', color: 'var(--neon-cyan)', fontWeight: 'var(--weight-bold)' }}>
                    <div className="td-content">
                      {student.xp}
                    </div>
                  </td>
                  <td data-label="Overall Progress" style={{ padding: 'var(--space-md) var(--space-sm)' }}>
                    <div className="td-content progress-container" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(studentProgress * 100)}%`, background: 'var(--gradient-xp)' }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{Math.round(studentProgress * 100)}%</span>
                    </div>
                  </td>
                  <td data-label="Last Active" style={{ padding: 'var(--space-md) var(--space-sm)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    <div className="td-content" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.last_active_at ? formatDistanceToNow(new Date(student.last_active_at), { addSuffix: true }) : 'Never'}
                    </div>
                  </td>
                  <td data-label="Actions" style={{ padding: 'var(--space-md) var(--space-sm)' }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-content">
                      {isInstructor ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Restricted</span>
                      ) : (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && (
          <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No users match the selected filters.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedStudent(null)} 
          title="Student Profile Details"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-xl)' }}>{selectedStudent.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{selectedStudent.email}</p>
                {selectedStudent.institute_id && (
                  <p style={{ margin: 'var(--space-xs) 0 0 0', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Institute ID:</span> <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--neon-cyan)' }}>{selectedStudent.institute_id}</span>
                  </p>
                )}
                <p style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  Joined: {new Date(selectedStudent.created_at).toLocaleDateString()} | Active: {selectedStudent.last_active_at ? new Date(selectedStudent.last_active_at).toLocaleString() : 'Never'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <LevelBadge level={selectedStudent.level} size="lg" />
                <div style={{ background: 'rgba(0, 242, 254, 0.1)', border: '1px solid var(--neon-cyan)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current XP</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{selectedStudent.xp}</div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <a 
                href={`/users/${selectedStudent.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary btn-sm" 
                style={{ textDecoration: 'none' }}
              >
                <span className="btn-label">View Full Public Profile ↗</span>
              </a>
            </div>

            <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: 0 }} />

            {/* Enrolled Courses Section */}
            <div>
              <h4 style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-md)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Enrolled Courses</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  ({selectedStudent.enrollments?.length || 0} courses)
                </span>
              </h4>

              {!selectedStudent.enrollments || selectedStudent.enrollments.length === 0 ? (
                <Card variant="glass" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  This student is not enrolled in any courses.
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {selectedStudent.enrollments.map((enr) => (
                    <Card 
                      key={enr.id} 
                      variant="glass" 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: 'var(--space-md)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        flexWrap: 'wrap',
                        gap: 'var(--space-sm)'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px', paddingRight: 'var(--space-md)' }}>
                        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {enr.courses?.title || 'Unknown Course'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                          <span style={{ 
                            fontSize: 'var(--text-xs)', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: enr.status === 'approved' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 165, 2, 0.15)',
                            color: enr.status === 'approved' ? '#2ed573' : '#ffa502',
                            textTransform: 'capitalize'
                          }}>
                            {enr.status}
                          </span>
                          
                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flex: 1, minWidth: '150px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.round(enr.progress * 100)}%`, background: 'var(--gradient-xp)' }} />
                            </div>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', minWidth: '32px' }}>{Math.round(enr.progress * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 'var(--space-sm)' }}>
                        {isInstructor ? (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Locked</span>
                        ) : (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => handleDeleteEnrollment(enr.id, enr.courses?.title || 'this course', selectedStudent.name)}
                            disabled={isPending}
                            title="Remove Course Enrollment"
                            style={{ padding: 'var(--space-xs) var(--space-sm)' }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-md)' }}>
              {!isInstructor ? (
                <Button 
                  variant="danger" 
                  onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)}
                  disabled={isPending}
                >
                  Delete Student Account
                </Button>
              ) : (
                <div />
              )}
              <Button 
                variant="secondary" 
                onClick={() => setSelectedStudent(null)}
                disabled={isPending}
              >
                Close
              </Button>
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
