'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from '@/components/ui/Button';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { replyToDoubt, markReplyAsAccepted, toggleReplyVote, recordDoubtView } from '@/features/doubts/actions/doubts';

export default function DiscussionThread({ doubt, replies, currentUser }: any) {
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    recordDoubtView(doubt.id);
  }, [doubt.id]);

  const handleSubmit = async (parentId?: string) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    await replyToDoubt(doubt.id, replyText, parentId);
    setReplyText('');
    setActiveReplyId(null);
    setIsSubmitting(false);
  };

  const handleAccept = async (replyId: string) => {
    await markReplyAsAccepted(doubt.id, replyId);
  };

  const handleVote = async (replyId: string, type: 'upvote' | 'downvote') => {
    await toggleReplyVote(replyId, type);
  };

  const isDoubtAuthor = currentUser.id === doubt.user_id;
  const isFaculty = currentUser.role === 'admin' || currentUser.role === 'instructor';

  // Organize replies into a tree
  const { topLevel, childrenMap } = useMemo(() => {
    const topLevel: any[] = [];
    const childrenMap: Record<string, any[]> = {};

    replies.forEach((r: any) => {
      if (r.parent_id) {
        if (!childrenMap[r.parent_id]) childrenMap[r.parent_id] = [];
        childrenMap[r.parent_id].push(r);
      } else {
        topLevel.push(r);
      }
    });

    return { topLevel, childrenMap };
  }, [replies]);

  const renderReply = (reply: any, isNested: boolean = false) => {
    const userVote = reply.votes?.find((v: any) => v.user_id === currentUser.id)?.vote_type;
    
    return (
      <div key={reply.id} style={{ 
        marginLeft: isNested ? 'var(--space-xl)' : 0,
        marginTop: isNested ? 'var(--space-sm)' : 'var(--space-md)',
        padding: isNested ? 0 : 'var(--space-md)',
        background: isNested ? 'transparent' : 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: reply.is_accepted ? '2px solid var(--neon-green)' : (isNested ? 'none' : '1px solid rgba(255,255,255,0.1)'),
        borderLeft: isNested ? '2px solid rgba(255,255,255,0.1)' : undefined,
        paddingLeft: isNested ? 'var(--space-md)' : 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <img src={reply.author?.avatar_url || '/default-avatar.png'} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reply.author?.name} 
                {reply.author?.role !== 'student' && <span style={{ fontSize: '10px', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>Faculty</span>}
                {reply.is_accepted && <span style={{ fontSize: '12px', color: 'var(--neon-green)' }}>✓ Accepted Answer</span>}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => handleVote(reply.id, 'upvote')} 
              style={{ background: 'transparent', border: 'none', color: userVote === 'upvote' ? 'var(--neon-blue)' : 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ▲
            </button>
            <span>{reply.upvotes_count || 0}</span>
            <button 
              onClick={() => handleVote(reply.id, 'downvote')} 
              style={{ background: 'transparent', border: 'none', color: userVote === 'downvote' ? 'var(--neon-pink)' : 'var(--text-secondary)', cursor: 'pointer' }}
            >
              ▼
            </button>
          </div>
        </div>

        <MarkdownRenderer content={reply.reply_text} />

        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', fontSize: 'var(--text-sm)' }}>
          {!isNested && (
            <button onClick={() => setActiveReplyId(activeReplyId === reply.id ? null : reply.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Reply
            </button>
          )}
          {(isDoubtAuthor || isFaculty) && !reply.is_accepted && !doubt.status.includes('resolved') && !isNested && (
            <button onClick={() => handleAccept(reply.id)} style={{ background: 'transparent', border: 'none', color: 'var(--neon-green)', cursor: 'pointer' }}>
              Accept Answer
            </button>
          )}
        </div>

        {activeReplyId === reply.id && (
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <textarea 
              value={replyText} 
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="input-field"
              style={{ width: '100%', minHeight: '80px', marginBottom: 'var(--space-sm)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button onClick={() => handleSubmit(reply.id)} isLoading={isSubmitting}>Submit</Button>
              <Button variant="secondary" onClick={() => setActiveReplyId(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {childrenMap[reply.id]?.map((child: any) => renderReply(child, true))}
      </div>
    );
  };

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      {/* Original Doubt */}
      <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>{doubt.title}</h1>
        
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img src={doubt.author?.avatar_url || '/default-avatar.png'} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{doubt.author?.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })} in {doubt.batch}
            </div>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)' }}>
            {doubt.tags?.map((t: any) => (
              <span key={t.tag_name} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                {t.tag_name}
              </span>
            ))}
          </div>
        </div>

        <MarkdownRenderer content={doubt.description} />
      </div>

      {/* Main Reply Input */}
      {!doubt.status.includes('resolved') && (
        <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>Add a Reply</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>Markdown and code blocks are supported.</p>
          <textarea 
            value={replyText} 
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your detailed answer here..."
            className="input-field"
            style={{ width: '100%', minHeight: '120px', marginBottom: 'var(--space-sm)' }}
          />
          <Button onClick={() => handleSubmit()} isLoading={isSubmitting}>Post Reply</Button>
        </div>
      )}

      {/* Replies List */}
      <div>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>{replies.length} Replies</h3>
        {topLevel.map(reply => renderReply(reply))}
      </div>
    </div>
  );
}
