import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import ReplyForm from './components/ReplyForm';
import AcceptReplyButton from './components/AcceptReplyButton';

export const dynamic = 'force-dynamic';

export default async function DoubtDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch doubt details (RLS handles batch access control)
  const { data: doubt, error } = await supabase
    .from('doubts')
    .select('*, author:profiles(name, avatar_url, role), course:courses(id, title), lesson:lessons(id, title)')
    .eq('id', id)
    .single();

  if (error || !doubt) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--neon-pink)' }}>Doubt Not Found</h2>
        <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
          This doubt may have been deleted or you do not have permission to view it.
        </p>
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Link href="/doubts" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Back to Doubts
          </Link>
        </div>
      </div>
    );
  }

  // Fetch replies
  const { data: replies } = await supabase
    .from('doubt_replies')
    .select('*, author:profiles!doubt_replies_user_id_fkey(name, avatar_url, role)')
    .eq('doubt_id', id)
    .order('created_at', { ascending: true });

  const isDoubtAuthor = user.id === doubt.user_id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Link href="/doubts" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← Back
        </Link>
      </div>
      
      <Card variant="glass" style={{ borderLeft: '4px solid var(--neon-cyan)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)', flex: '1 1 auto', minWidth: 0 }}>
            <h1 style={{ fontSize: 'var(--text-xl)', margin: 0, wordBreak: 'break-word' }}>{doubt.title}</h1>
            {(doubt.course || doubt.lesson) && (
              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', marginTop: 'var(--space-2xs)', flexWrap: 'wrap' }}>
                {doubt.course && (
                  <Link href={`/courses/${doubt.course.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: 'var(--neon-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      📚 {doubt.course.title}
                    </span>
                  </Link>
                )}
                {doubt.lesson && (
                  <Link href={`/courses/${doubt.course_id}/${doubt.lesson.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: 'var(--neon-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      📄 {doubt.lesson.title}
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
          <span style={{ 
            fontSize: 'var(--text-xs)', 
            padding: '4px 12px', 
            borderRadius: '12px', 
            background: doubt.status === 'resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            color: doubt.status === 'resolved' ? '#22c55e' : '#eab308',
            fontWeight: 'var(--weight-semibold)',
            flexShrink: 0
          }}>
            {doubt.status === 'resolved' ? 'Resolved' : 'Open'}
          </span>
        </div>
        
        <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word' }}>
          {doubt.description}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {doubt.author?.avatar_url ? (
            <img src={doubt.author.avatar_url} alt={doubt.author.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {doubt.author?.name?.charAt(0) || '?'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
              {doubt.author?.name} {doubt.author?.role !== 'student' ? <span style={{ color: 'var(--neon-gold)' }}>({doubt.author?.role})</span> : ''}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Batch {doubt.batch} • {new Date(doubt.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginLeft: 'var(--space-md)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--space-xs)' }}>
          {replies?.length || 0} Replies
        </h3>
        
        {replies && replies.length > 0 ? (
          replies.map((reply: any) => (
            <Card key={reply.id} variant="glass" style={{ border: reply.is_accepted ? '1px solid #22c55e' : undefined, background: reply.is_accepted ? 'rgba(34, 197, 94, 0.05)' : undefined }}>
              {reply.is_accepted && (
                <div style={{ color: '#22c55e', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✅ Accepted Answer
                </div>
              )}
              <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {reply.reply_text}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {reply.author?.avatar_url ? (
                    <img src={reply.author.avatar_url} alt={reply.author.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)' }}>
                      {reply.author?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                      {reply.author?.name} {reply.author?.role !== 'student' ? <span style={{ color: 'var(--neon-gold)' }}>({reply.author?.role})</span> : ''}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(reply.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {isDoubtAuthor && !reply.is_accepted && doubt.status !== 'resolved' && (
                  <AcceptReplyButton doubtId={doubt.id} replyId={reply.id} />
                )}
              </div>
            </Card>
          ))
        ) : (
          <p className="text-secondary">No replies yet. Be the first to help out!</p>
        )}
      </div>

      {doubt.status !== 'resolved' && (
        <Card variant="glass" style={{ marginLeft: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
          <h4 style={{ marginBottom: 'var(--space-sm)' }}>Your Reply</h4>
          <ReplyForm doubtId={doubt.id} />
        </Card>
      )}
    </div>
  );
}
