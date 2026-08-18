'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDirectChat } from '@/features/chat/actions/chat';
import { removeStudentEnrollment } from '@/features/courses/actions/enroll';
import { createClient } from '@/lib/supabase/client';

interface JoinedStudentsListProps {
  enrollments: any[];
  currentUserId?: string;
  isStaff?: boolean;
}

export default function JoinedStudentsList({ enrollments, currentUserId: propUserId, isStaff: propIsStaff }: JoinedStudentsListProps) {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(propUserId);
  const [isStaff, setIsStaff] = useState<boolean | undefined>(propIsStaff);
  const [spawningChatId, setSpawningChatId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      if (propUserId !== undefined && propIsStaff !== undefined) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          setIsStaff(['admin', 'instructor', 'developer'].includes(profile.role));
        }
      }
    }
    checkUser();
  }, [propUserId, propIsStaff]);

  if (!enrollments || enrollments.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No students have joined this course yet.</p>;
  }

  const visibleEnrollments = showAll ? enrollments : enrollments.slice(0, 4);

  const handleStartChat = async (studentUserId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!studentUserId) return;
    setSpawningChatId(studentUserId);
    try {
      await createDirectChat(studentUserId);
      router.push('/dashboard/chat');
    } catch (err) {
      console.error('Failed to start chat:', err);
      alert('Could not open chat with this student.');
    } finally {
      setSpawningChatId(null);
    }
  };

  const handleRemoveStudent = async (enrollmentId: string, studentName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove ${studentName || 'this student'} from the course?`)) return;
    setDeletingId(enrollmentId);
    try {
      const res = await removeStudentEnrollment(enrollmentId);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert('Failed to remove student: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
        {visibleEnrollments.map((enrollment: any) => {
          const studentUserId = enrollment.user_id || enrollment.profiles?.id;
          const studentName = enrollment.profiles?.name || 'Unknown User';
          const isMe = currentUserId && studentUserId === currentUserId;

          return (
            <Card key={enrollment.id} variant="glass" style={{ padding: 'var(--space-md)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                <Link 
                  href={studentUserId ? (isMe ? '/profile' : `/users/${studentUserId}`) : '#'} 
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
                >
                  {enrollment.profiles?.avatar_url ? (
                    <img 
                      src={enrollment.profiles.avatar_url} 
                      alt={studentName} 
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--glass-border)' }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
                      <User size={24} opacity={0.5} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {studentName} {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'normal' }}>(You)</span>}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {enrollment.profiles?.email}
                    </p>
                    {enrollment.profiles?.institute_id && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', opacity: 0.8 }}>
                        ID: {enrollment.profiles.institute_id}
                      </p>
                    )}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      display: 'inline-block', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      backgroundColor: enrollment.status === 'approved' ? 'rgba(0, 255, 0, 0.1)' : 
                                       enrollment.status === 'rejected' ? 'rgba(255, 0, 0, 0.1)' : 
                                       'rgba(255, 165, 0, 0.1)', 
                      color: enrollment.status === 'approved' ? 'var(--neon-lime)' : 
                             enrollment.status === 'rejected' ? 'var(--danger)' : 
                             'var(--neon-gold)' 
                    }}>
                      {enrollment.status ? enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1) : 'Joined'}
                    </div>
                  </div>
                </Link>

                {/* Actions: Chat (everyone) & Delete (faculty/admin) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Chat Icon - Visible to everyone */}
                  {studentUserId && !isMe && (
                    <button
                      type="button"
                      onClick={(e) => handleStartChat(studentUserId, e)}
                      disabled={spawningChatId === studentUserId}
                      title="Direct Message"
                      style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--neon-cyan)',
                        color: 'var(--neon-cyan)',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        cursor: spawningChatId === studentUserId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(0, 240, 255, 0.25)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)'; }}
                    >
                      {spawningChatId === studentUserId ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                    </button>
                  )}

                  {/* Remove/Delete Icon - Visible to Faculty/Admin */}
                  {isStaff && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveStudent(enrollment.id, studentName, e)}
                      disabled={deletingId === enrollment.id}
                      title="Remove Student from Course"
                      style={{
                        background: 'rgba(255, 59, 48, 0.1)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        cursor: deletingId === enrollment.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(255, 59, 48, 0.25)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'; }}
                    >
                      {deletingId === enrollment.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {!showAll && enrollments.length > 4 && (
        <Button variant="secondary" onClick={() => setShowAll(true)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%' }}>
          View all {enrollments.length} students
        </Button>
      )}

      {showAll && enrollments.length > 4 && (
        <Button variant="ghost" onClick={() => setShowAll(false)} style={{ marginTop: 'var(--space-md)', padding: '16px', fontWeight: 'bold', width: '100%', border: '1px solid var(--glass-border)' }}>
          View Less
        </Button>
      )}
    </div>
  );
}
