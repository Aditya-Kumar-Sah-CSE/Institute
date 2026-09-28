'use client';

import { FormEvent, useState } from 'react';
import { createCourseNotice } from '../actions/notices';

type CourseNotice = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: { name: string | null } | { name: string | null }[] | null;
};

export default function CourseNoticesClient({ courseId, canPost, notices: initialNotices }: { courseId: string; canPost: boolean; notices: CourseNotice[] }) {
  const [notices, setNotices] = useState(initialNotices);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  return (
    <section style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0, 240, 255, 0.2)', background: 'rgba(0, 240, 255, 0.035)' }}>
      <h3 style={{ margin: '0 0 var(--space-md)', color: 'var(--neon-cyan)' }}>Course Notices</h3>
      {canPost && <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <input aria-label="Notice title" maxLength={120} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title" />
        <textarea aria-label="Notice details" maxLength={3000} required value={content} onChange={e => setContent(e.target.value)} placeholder="Write a notice for this course" rows={3} />
        {error && <p role="alert" style={{ color: 'var(--text-danger)', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ justifySelf: 'start' }}>{saving ? 'Publishing…' : 'Publish Notice'}</button>
      </form>}
      {notices.length === 0 ? <p style={{ color: 'var(--text-muted)', margin: 0 }}>No notices for this course yet.</p> : <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
        {notices.map(notice => <article key={notice.id} style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)', border: '1px solid var(--border-divider)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap' }}><strong>{notice.title}</strong><small style={{ color: 'var(--text-muted)' }}>{(Array.isArray(notice.profiles) ? notice.profiles[0]?.name : notice.profiles?.name) || 'Course staff'} · {new Date(notice.created_at).toLocaleString()}</small></div>
          <p style={{ whiteSpace: 'pre-wrap', margin: 'var(--space-sm) 0 0' }}>{notice.content}</p>
        </article>)}
      </div>}
    </section>
  );
}
