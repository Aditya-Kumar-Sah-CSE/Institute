'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LevelBadge from '@/components/shared/LevelBadge';
import { formatDistanceToNow } from 'date-fns';
import { Search, ShieldAlert, Code, CheckCircle, UserCheck, Shield } from 'lucide-react';
import { deleteStudent, deleteEnrollment, makeAdmin, makeFaculty, makeStudent, makeDeveloper } from '@/features/admin/actions/adminActions';
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
  graduation_period?: string | null;
  enrollments: EnrollmentDetail[] | null;
}

interface StudentLeaderboardTableProps {
  students: StudentDetail[];
  isInstructor: boolean;
  currentUserId?: string;
  currentUserEmail?: string;
  superAdminEmail: string;
}

import './StudentLeaderboardTable.css';

export default function StudentLeaderboardTable({ students, isInstructor, currentUserId, currentUserEmail, superAdminEmail }: StudentLeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'admin' | 'developer'>('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled'>('all');
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  
  const [adminPromotionTarget, setAdminPromotionTarget] = useState<{ id: string, name: string } | null>(null);
  const [makeFacultyTarget, setMakeFacultyTarget] = useState<{ id: string, name: string } | null>(null);
  const [makeStudentTarget, setMakeStudentTarget] = useState<{ id: string, name: string } | null>(null);
  const [makeDeveloperTarget, setMakeDeveloperTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, role: string } | null>(null);
  
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Local state for dynamically modified student roles
  const [modifiedRoles, setModifiedRoles] = useState<Record<string, string>>({});

  // Search and Role filter logic
  const filteredStudents = students.filter(student => {
    if (deletedIds.has(student.id)) return false;
    const effectiveRole = modifiedRoles[student.id] || student.role;
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || effectiveRole === roleFilter;
    
    let matchesEnrollment = true;
    if (enrollmentFilter === 'enrolled' && currentUserId) {
      matchesEnrollment = student.enrollments?.some(e => e.courses?.created_by === currentUserId) || false;
    }
    
    return matchesSearch && matchesRole && matchesEnrollment;
  });

  const paginatedStudents = filteredStudents.slice(0, visibleCount);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setVisibleCount(5);
  }, [searchTerm, roleFilter, enrollmentFilter]);

  const handleDeleteStudentClick = (studentId: string, studentName: string, role: string) => {
    setActionError(null);
    setDeleteTarget({ id: studentId, name: studentName, role });
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await deleteStudent(deleteTarget.id);
        if (result.error) {
          setActionError(`Error deleting user: ${result.error}`);
        } else {
          setDeletedIds(prev => new Set(prev).add(deleteTarget.id));
          setSelectedStudent(null);
          setDeleteTarget(null);
        }
      } catch (err) {
        console.error(err);
        setActionError('An unexpected error occurred deleting the user.');
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
    setActionError(null);
    setAdminPromotionTarget({ id: userId, name: userName });
  };

  const confirmMakeAdmin = async () => {
    if (!adminPromotionTarget) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await makeAdmin(adminPromotionTarget.id);
        if (result.error) {
          setActionError(result.error);
        } else {
          setModifiedRoles(prev => ({ ...prev, [adminPromotionTarget.id]: 'admin' }));
          if (selectedStudent?.id === adminPromotionTarget.id) {
            setSelectedStudent(prev => prev ? { ...prev, role: 'admin' } : null);
          }
          setAdminPromotionTarget(null);
        }
      } catch (err) {
        console.error(err);
        setActionError('An unexpected error occurred upgrading to Admin.');
      }
    });
  };

  const handleMakeFacultyClick = (userId: string, userName: string) => {
    setActionError(null);
    setMakeFacultyTarget({ id: userId, name: userName });
  };

  const confirmMakeFaculty = async () => {
    if (!makeFacultyTarget) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await makeFaculty(makeFacultyTarget.id);
        if (result.error) {
          setActionError(result.error);
        } else {
          setModifiedRoles(prev => ({ ...prev, [makeFacultyTarget.id]: 'instructor' }));
          if (selectedStudent?.id === makeFacultyTarget.id) {
            setSelectedStudent(prev => prev ? { ...prev, role: 'instructor' } : null);
          }
          setMakeFacultyTarget(null);
        }
      } catch (err) {
        console.error(err);
        setActionError('An unexpected error occurred assigning Faculty role.');
      }
    });
  };

  const handleMakeStudentClick = (userId: string, userName: string) => {
    setActionError(null);
    setMakeStudentTarget({ id: userId, name: userName });
  };

  const confirmMakeStudent = async () => {
    if (!makeStudentTarget) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await makeStudent(makeStudentTarget.id);
        if (result.error) {
          setActionError(result.error);
        } else {
          setModifiedRoles(prev => ({ ...prev, [makeStudentTarget.id]: 'student' }));
          if (selectedStudent?.id === makeStudentTarget.id) {
            setSelectedStudent(prev => prev ? { ...prev, role: 'student' } : null);
          }
          setMakeStudentTarget(null);
        }
      } catch (err) {
        console.error(err);
        setActionError('An unexpected error occurred setting Student role.');
      }
    });
  };

  const handleMakeDeveloperClick = (userId: string, userName: string) => {
    setActionError(null);
    setMakeDeveloperTarget({ id: userId, name: userName });
  };

  const confirmMakeDeveloper = async () => {
    if (!makeDeveloperTarget) return;
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await makeDeveloper(makeDeveloperTarget.id);
        if (result.error) {
          setActionError(result.error);
        } else {
          setModifiedRoles(prev => ({ ...prev, [makeDeveloperTarget.id]: 'developer' }));
          if (selectedStudent?.id === makeDeveloperTarget.id) {
            setSelectedStudent(prev => prev ? { ...prev, role: 'developer' } : null);
          }
          setMakeDeveloperTarget(null);
        }
      } catch (err) {
        console.error(err);
        setActionError('An unexpected error occurred assigning Developer role.');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      
      {/* Global Error Banner if any */}
      {actionError && (
        <div style={{ 
          background: 'rgba(255, 71, 87, 0.15)', 
          border: '1px solid rgba(255, 71, 87, 0.4)', 
          color: '#ff4757', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-md)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          fontSize: 'var(--text-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="search-container" style={{ marginBottom: 'var(--space-sm)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <Input 
            placeholder="Search users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} style={{ color: 'var(--text-muted)' }} />}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
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

          {/* Role Filter Buttons */}
          <div className="role-filter-group">
            <Button 
              variant={roleFilter === 'all' ? 'primary' : 'secondary'} 
              onClick={() => setRoleFilter('all')}
              size="sm"
            >
              ALL
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
            <Button 
              variant={roleFilter === 'developer' ? 'primary' : 'secondary'} 
              onClick={() => setRoleFilter('developer')}
              size="sm"
              style={roleFilter === 'developer' ? { background: '#00f2fe', color: '#000', borderColor: '#00f2fe' } : {}}
            >
              Developer
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-responsive-wrapper">
        <table className="responsive-table">
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
              const effectiveRole = modifiedRoles[student.id] || student.role;
              const isDeveloper = effectiveRole === 'developer' || student.email?.toLowerCase() === superAdminEmail?.toLowerCase();
              const isAdmin = effectiveRole === 'admin';
              const isInstructorRole = effectiveRole === 'instructor';
              
              const roleDisplayLabel = isDeveloper ? 'developer' : effectiveRole;
              const roleBadgeBg = isDeveloper ? 'rgba(0, 242, 254, 0.15)' : isAdmin ? 'rgba(177, 78, 255, 0.15)' : isInstructorRole ? 'rgba(255, 165, 2, 0.15)' : 'rgba(46, 213, 115, 0.15)';
              const roleBadgeColor = isDeveloper ? '#00f2fe' : isAdmin ? 'var(--neon-purple)' : isInstructorRole ? '#ffa502' : '#2ed573';
              const roleBorder = isDeveloper ? '1px solid rgba(0, 242, 254, 0.3)' : isAdmin ? '1px solid rgba(177, 78, 255, 0.3)' : isInstructorRole ? '1px solid rgba(255, 165, 2, 0.3)' : '1px solid rgba(46, 213, 115, 0.3)';

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
                  onClick={() => setSelectedStudent({ ...student, role: effectiveRole })}
                >
                  <td data-label="Name" style={{ padding: 'var(--space-md) var(--space-sm)', fontWeight: 'var(--weight-semibold)' }}>
                    <div className="td-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', overflow: 'hidden' }}>
                      <span className="hover-underline" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', display: 'block' }}>{student.name}</span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        marginTop: '4px',
                        background: roleBadgeBg,
                        color: roleBadgeColor,
                        border: roleBorder,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isDeveloper && <Code size={10} />}
                        {roleDisplayLabel}
                      </span>
                    </div>
                  </td>

                  <td data-label="Email" style={{ padding: 'var(--space-md) var(--space-sm)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    <div className="td-content" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
                      {effectiveRole === 'student' && student.graduation_period && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>{student.graduation_period} BATCH</div>
                      )}
                    </div>
                  </td>

                  <td data-label="Level" style={{ padding: 'var(--space-md) var(--space-sm)' }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-content">
                      <LevelBadge level={student.level} size="sm" />
                    </div>
                  </td>

                  <td data-label="XP" style={{ padding: 'var(--space-md) var(--space-sm)', color: 'var(--neon-cyan)', fontWeight: 'var(--weight-bold)' }}>
                    <div className="td-content">
                      ⚡ {student.xp}
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
                      ) : isDeveloper ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: '#00f2fe', fontWeight: 'bold' }}>Developer</span>
                      ) : (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteStudentClick(student.id, student.name, effectiveRole)}
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
      {filteredStudents.length > 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Showing {paginatedStudents.length} of {filteredStudents.length} entries
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {visibleCount > 5 && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setVisibleCount(5)}
              >
                Show Less
              </Button>
            )}
            {visibleCount < filteredStudents.length && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setVisibleCount(prev => prev + 5)}
              >
                Show More
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Selected User Details Modal */}
      {selectedStudent && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedStudent(null)} 
          title={`${(modifiedRoles[selectedStudent.id] || selectedStudent.role).toUpperCase()} Profile Details`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedStudent.name}
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'developer' ? 'rgba(0, 242, 254, 0.2)' : (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'admin' ? 'rgba(177, 78, 255, 0.2)' : (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'instructor' ? 'rgba(255, 165, 2, 0.2)' : 'rgba(46, 213, 115, 0.2)',
                    color: (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'developer' ? '#00f2fe' : (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'admin' ? 'var(--neon-purple)' : (modifiedRoles[selectedStudent.id] || selectedStudent.role) === 'instructor' ? '#ffa502' : '#2ed573',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {modifiedRoles[selectedStudent.id] || selectedStudent.role}
                  </span>
                </h3>
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
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>⚡ {selectedStudent.xp}</div>
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
                  This user is not enrolled in any courses.
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
                      <div style={{ flex: 1, minWidth: '180px', paddingRight: 'var(--space-md)' }}>
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
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flex: 1, minWidth: '120px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.round(enr.progress * 100)}%`, background: 'var(--gradient-xp)' }} />
                            </div>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', minWidth: '32px' }}>{Math.round(enr.progress * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
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

            {/* Modal Role Actions */}
            {!isInstructor && selectedStudent.email !== superAdminEmail && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Role Management</h4>
                <div className="user-action-buttons-group">
                  {(modifiedRoles[selectedStudent.id] || selectedStudent.role) !== 'student' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleMakeStudentClick(selectedStudent.id, selectedStudent.name)}
                      disabled={isPending}
                    >
                      🎓 Make Student
                    </Button>
                  )}

                  {(modifiedRoles[selectedStudent.id] || selectedStudent.role) !== 'instructor' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleMakeFacultyClick(selectedStudent.id, selectedStudent.name)}
                      disabled={isPending}
                      style={{ color: '#ffa502', borderColor: 'rgba(255, 165, 2, 0.4)' }}
                    >
                      👨‍🏫 Make Faculty
                    </Button>
                  )}

                  {(modifiedRoles[selectedStudent.id] || selectedStudent.role) !== 'admin' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleMakeAdminClick(selectedStudent.id, selectedStudent.name)}
                      disabled={isPending}
                      style={{ color: 'var(--neon-purple)', borderColor: 'rgba(177, 78, 255, 0.4)' }}
                    >
                      👑 Make Admin
                    </Button>
                  )}

                  {(modifiedRoles[selectedStudent.id] || selectedStudent.role) !== 'developer' && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleMakeDeveloperClick(selectedStudent.id, selectedStudent.name)}
                      disabled={isPending}
                      style={{ color: '#00f2fe', borderColor: 'rgba(0, 242, 254, 0.4)' }}
                    >
                      👨‍💻 Make Developer
                    </Button>
                  )}

                  <Button 
                    variant="danger" 
                    onClick={() => handleDeleteStudentClick(selectedStudent.id, selectedStudent.name, (modifiedRoles[selectedStudent.id] || selectedStudent.role))}
                    disabled={isPending}
                  >
                    🗑️ Delete Account
                  </Button>
                </div>
              </div>
            )}

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
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to promote <strong>{adminPromotionTarget.name}</strong> to Admin? 
                They will receive administrative access to manage students, faculty, and content.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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
          title="Assign Faculty Role"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(255, 165, 2, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-gold)' }}>
                👨‍🏫
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to assign <strong>{makeFacultyTarget.name}</strong> to Faculty? 
                They will have permission to manage courses and evaluations.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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
          title="Set Student Role"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(0, 242, 254, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--neon-cyan)' }}>
                🎓
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to change <strong>{makeStudentTarget.name}</strong> to Student role? 
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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

      {/* Make Developer Confirmation Modal */}
      {makeDeveloperTarget && (
        <Modal 
          isOpen={true} 
          onClose={() => setMakeDeveloperTarget(null)} 
          title="Promote to Developer"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', padding: 'var(--space-sm)', background: 'rgba(0, 242, 254, 0.1)', borderRadius: 'var(--radius-md)', color: '#00f2fe' }}>
                👨‍💻
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to promote <strong>{makeDeveloperTarget.name}</strong> to Developer? 
                This will grant them Developer role permissions.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <Button 
                variant="secondary" 
                onClick={() => setMakeDeveloperTarget(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmMakeDeveloper}
                disabled={isPending}
                style={{ background: '#00f2fe', borderColor: '#00f2fe', color: '#000' }}
              >
                {isPending ? 'Processing...' : 'Yes, Make Developer'}
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
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete user account <strong>{deleteTarget.name}</strong>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
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
