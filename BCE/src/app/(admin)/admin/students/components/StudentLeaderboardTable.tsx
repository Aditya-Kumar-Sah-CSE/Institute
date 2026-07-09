'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LevelBadge from '@/components/shared/LevelBadge';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';
import { deleteStudent, deleteEnrollment, makeAdmin, makeFaculty, makeStudent } from '@/features/admin/actions/adminActions';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import type { LevelName } from '@/types';

interface EnrollmentDetail {
  id: string;
  progress: number;
  status: string;
  course_id: string;
  courses: {
    title: string;
    created_by?: string;
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
  currentUserId?: string;
}

import './StudentLeaderboardTable.css';

export default function StudentLeaderboardTable({ students, isInstructor, currentUserId }: StudentLeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'admin'>('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [adminPromotionTarget, setAdminPromotionTarget] = useState<{ id: string, name: string } | null>(null);
  const [makeFacultyTarget, setMakeFacultyTarget] = useState<{ id: string, name: string } | null>(null);
  const [makeStudentTarget, setMakeStudentTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, role: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search and Role filter logic
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || student.role === roleFilter;
    
    let matchesEnrollment = true;
    if (enrollmentFilter === 'enrolled' && currentUserId) {
      matchesEnrollment = student.enrollments?.some(e => e.courses?.created_by === currentUserId) || false;
    }
    
    return matchesSearch && matchesRole && matchesEnrollment;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, enrollmentFilter]);

  const handleDeleteStudentClick = (studentId: string, studentName: string, role: string) => {
    setDeleteTarget({ id: studentId, name: studentName, role });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        const result = await deleteStudent(deleteTarget.id);
        if (result.error) {
          alert(`Error deleting user: ${result.error}`);
        } else {
          setSelectedStudent(null);
          setDeleteTarget(null);
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred.');
      }
    });
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

  const handleMakeAdminClick = (userId: string, userName: string) => {
    setAdminPromotionTarget({ id: userId, name: userName });
  };

  const confirmMakeAdmin = async () => {
    if (!adminPromotionTarget) return;
    
    startTransition(async () => {
      try {
        const result = await makeAdmin(adminPromotionTarget.id);
        if (result.error) {
          alert(`Error making admin: ${result.error}`);
        } else {
          setSelectedStudent(null);
          setAdminPromotionTarget(null);
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred.');
      }
    });
  };

  const handleMakeFacultyClick = (userId: string, userName: string) => {
    setMakeFacultyTarget({ id: userId, name: userName });
  };

  const confirmMakeFaculty = async () => {
    if (!makeFacultyTarget) return;
    
    startTransition(async () => {
      try {
        const result = await makeFaculty(makeFacultyTarget.id);
        if (result.error) {
          alert(`Error making faculty: ${result.error}`);
        } else {
          setSelectedStudent(null);
          setMakeFacultyTarget(null);
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred.');
      }
    });
  };

  const handleMakeStudentClick = (userId: string, userName: string) => {
    setMakeStudentTarget({ id: userId, name: userName });
  };

  const confirmMakeStudent = async () => {
    if (!makeStudentTarget) return;
    
    startTransition(async () => {
      try {
        const result = await makeStudent(makeStudentTarget.id);
        if (result.error) {
          alert(`Error making student: ${result.error}`);
        } else {
          setSelectedStudent(null);
          setMakeStudentTarget(null);
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred.');
      }
    });
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
            icon={<Search size={18} style={{ color: 'var(--text-muted)' }} />}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {/* Enrollment Filter Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-sm)', gap: '4px' }}>
            <button 
              className={`btn-ghost ${enrollmentFilter === 'all' ? 'active' : ''}`}
              style={{ padding: '6px 12px', borderRadius: '4px', background: enrollmentFilter === 'all' ? 'var(--bg-secondary)' : 'transparent', color: enrollmentFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
              onClick={() => setEnrollmentFilter('all')}
            >
              All Users
            </button>
            <button 
              className={`btn-ghost ${enrollmentFilter === 'enrolled' ? 'active' : ''}`}
              style={{ padding: '6px 12px', borderRadius: '4px', background: enrollmentFilter === 'enrolled' ? 'var(--bg-secondary)' : 'transparent', color: enrollmentFilter === 'enrolled' ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
              onClick={() => setEnrollmentFilter('enrolled')}
            >
              My Enrolled
            </button>
          </div>

          {/* Role Filters */}
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
          <Button 
            variant={roleFilter === 'admin' ? 'primary' : 'secondary'} 
            onClick={() => setRoleFilter('admin')}
            size="sm"
          >
            Admin
          </Button>
        </div>
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
                    <div suppressHydrationWarning className="td-content" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.last_active_at ? formatDistanceToNow(new Date(student.last_active_at), { addSuffix: true }) : 'Never'}
                    </div>
                  </td>
                  <td data-label="Actions" style={{ padding: 'var(--space-md) var(--space-sm)' }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-content">
                      {isInstructor ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Restricted</span>
                      ) : student.email === SUPER_ADMIN_EMAIL ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-purple)', fontWeight: 'bold' }}>Developer</span>
                      ) : (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteStudentClick(student.id, student.name, student.role)}
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
          title={selectedStudent.role === 'admin' ? "Admin Profile Details" : selectedStudent.role === 'instructor' ? "Faculty Profile Details" : "Student Profile Details"}
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
                <p suppressHydrationWarning style={{ margin: 'var(--space-sm) 0 0 0', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
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
              {!isInstructor && selectedStudent.email !== SUPER_ADMIN_EMAIL ? (
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  {selectedStudent.role === 'admin' ? (
                    <Button 
                      variant="primary" 
                      onClick={() => handleMakeFacultyClick(selectedStudent.id, selectedStudent.name)}
                      disabled={isPending}
                      style={{ background: 'var(--neon-gold)', borderColor: 'var(--neon-gold)', color: '#000' }}
                    >
                      Make Faculty
                    </Button>
                  ) : selectedStudent.role === 'instructor' ? (
                    <>
                      <Button 
                        variant="primary" 
                        onClick={() => handleMakeStudentClick(selectedStudent.id, selectedStudent.name)}
                        disabled={isPending}
                        style={{ background: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', color: '#000' }}
                      >
                        Make Student
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={() => handleMakeAdminClick(selectedStudent.id, selectedStudent.name)}
                        disabled={isPending}
                        style={{ background: 'var(--neon-purple)', borderColor: 'var(--neon-purple)', color: '#fff' }}
                      >
                        Make Admin
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="danger" 
                      onClick={() => handleDeleteStudentClick(selectedStudent.id, selectedStudent.name, selectedStudent.role)}
                      disabled={isPending}
                    >
                      Delete Student Account
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* Admin Promotion Confirmation Modal */}
      {adminPromotionTarget && (
        <Modal 
          isOpen={true} 
          onClose={() => setAdminPromotionTarget(null)} 
          title="Promote to Admin"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(177, 78, 255, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-purple)' }}>
                👑
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Are you sure you want to promote <strong>{adminPromotionTarget.name}</strong> to Admin? 
                They will have full access to manage students, faculty, and system settings.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <Button 
                variant="secondary" 
                onClick={() => setAdminPromotionTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmMakeAdmin}
                disabled={isPending}
                style={{ background: 'var(--neon-purple)', borderColor: 'var(--neon-purple)' }}
              >
                {isPending ? 'Promoting...' : 'Yes, Promote to Admin'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Make Faculty Confirmation Modal */}
      {makeFacultyTarget && (
        <Modal 
          isOpen={true} 
          onClose={() => setMakeFacultyTarget(null)} 
          title="Demote to Faculty"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(255, 165, 2, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-gold)' }}>
                👨‍🏫
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Are you sure you want to change <strong>{makeFacultyTarget.name}</strong> from Admin to Faculty? 
                They will lose access to administrative features.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <Button 
                variant="secondary" 
                onClick={() => setMakeFacultyTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmMakeFaculty}
                disabled={isPending}
                style={{ background: 'var(--neon-gold)', borderColor: 'var(--neon-gold)', color: '#000' }}
              >
                {isPending ? 'Processing...' : 'Yes, Make Faculty'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Make Student Confirmation Modal */}
      {makeStudentTarget && (
        <Modal 
          isOpen={true} 
          onClose={() => setMakeStudentTarget(null)} 
          title="Demote to Student"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(0, 242, 254, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-cyan)' }}>
                🎓
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Are you sure you want to change <strong>{makeStudentTarget.name}</strong> from Faculty to a Student? 
                They will lose access to instructor courses, grading, and dashboards.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <Button 
                variant="secondary" 
                onClick={() => setMakeStudentTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmMakeStudent}
                disabled={isPending}
                style={{ background: 'var(--neon-cyan)', borderColor: 'var(--neon-cyan)', color: '#000' }}
              >
                {isPending ? 'Processing...' : 'Yes, Make Student'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <Modal 
          isOpen={true} 
          onClose={() => setDeleteTarget(null)} 
          title="Delete Account"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(255, 71, 87, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-pink)' }}>
                ⚠️
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete {deleteTarget.role === 'instructor' ? 'faculty member' : 'student'} <strong>{deleteTarget.name}</strong>? 
                This action cannot be undone and will erase all their progress and data.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <Button 
                variant="secondary" 
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={confirmDeleteStudent}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Yes, Delete Account'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
