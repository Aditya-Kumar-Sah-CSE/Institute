'use client';

import { FormEvent, useState } from 'react';
import { createCourseNotice, deleteCourseNotice } from '../actions/notices';
import { Trash2 } from 'lucide-react';

type CourseNotice = {
  id: string;
  course_id?: string;
  created_by?: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: { name: string | null } | { name: string | null }[] | null;
};

export default function CourseNoticesClient({
  courseId,
  canPost,
  currentUserId,
  notices: initialNotices,
}: {
  courseId: string;
  canPost: boolean;
  currentUserId?: string;
  notices: CourseNotice[];
}) {
  const [notices, setNotices] = useState(initialNotices);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const result = await createCourseNotice(courseId, title, content);
    if (!result.success) {
      setError(result.error);
    } else {
      if (result.notice) setNotices([{ ...result.notice, profiles: { name: 'You' } }, ...notices]);
      setTitle('');
      setContent('');
    }
    setSaving(false);
  }

  async function handleDelete(noticeId: string) {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    setDeletingId(noticeId);
    setError('');
    const result = await deleteCourseNotice(courseId, noticeId);
    if (!result.success) {
      setError(result.error || 'Failed to delete notice.');
    } else {
      setNotices(prev => prev.filter(n => n.id !== noticeId));
    }
    setDeletingId(null);
  }

  return (
    <section className="course-notices-section" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0, 240, 255, 0.2)', background: 'rgba(0, 240, 255, 0.035)', padding: 'var(--space-md)' }}>
      <h3 style={{ margin: '0 0 var(--space-md)', color: 'var(--neon-cyan)' }}>Course Notices</h3>
      {canPost && (
        <form className="course-notices-form" onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <input aria-label="Notice title" maxLength={120} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title" />
          <textarea aria-label="Notice details" maxLength={3000} required value={content} onChange={e => setContent(e.target.value)} placeholder="Write a notice for this course" rows={3} />
          {error && <p role="alert" style={{ color: 'var(--text-danger, #ef4444)', margin: 0, fontSize: 'var(--text-sm)' }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ justifySelf: 'start' }}>{saving ? 'Publishing…' : 'Publish Notice'}</button>
        </form>
      )}
      {notices.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No notices for this course yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {notices.map(notice => {
            const authorName = (Array.isArray(notice.profiles) ? notice.profiles[0]?.name : notice.profiles?.name) || 'Course staff';
            const canDelete = canPost || (currentUserId && notice.created_by === currentUserId);

            return (
              <article key={notice.id} className="course-notice-card" style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-body)', border: '1px solid var(--border-divider)', padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{notice.title}</strong>
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      {authorName} · {new Date(notice.created_at).toLocaleString()}
                    </small>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(notice.id)}
                      disabled={deletingId === notice.id}
                      title="Delete notice"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--neon-red, #ef4444)',
                        cursor: deletingId === notice.id ? 'not-allowed' : 'pointer',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        opacity: deletingId === notice.id ? 0.6 : 1,
                      }}
                      onMouseOver={(e) => { if (deletingId !== notice.id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                      onMouseOut={(e) => { if (deletingId !== notice.id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                    >
                      <Trash2 size={13} />
                      {deletingId === notice.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </div>
                <p style={{ whiteSpace: 'pre-wrap', margin: 'var(--space-sm) 0 0', color: 'var(--text-secondary)' }}>{notice.content}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
