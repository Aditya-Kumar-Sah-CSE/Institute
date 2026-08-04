'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from '@/components/ui/Button';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { Send } from 'lucide-react';
import { replyToDoubt, markReplyAsAccepted, toggleReplyVote, recordDoubtView, toggleDoubtLike } from '@/features/doubts/actions/doubts';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231a1a2e'/%3E%3Cpath d='M50 55a20 20 0 100-40 20 20 0 000 40zm-30 35a30 30 0 0160 0' fill='%234a4a6a'/%3E%3C/svg%3E";

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

  const handleDoubtLike = async () => {
    await toggleDoubtLike(doubt.id);
  };

  const isDoubtAuthor = currentUser.id === doubt.user_id;
  const isFaculty = currentUser.role === 'admin' || currentUser.role === 'instructor';
  const hasLikedDoubt = doubt.likes?.some((l: any) => l.user_id === currentUser.id);

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
        marginLeft: isNested ? 'clamp(1rem, 5vw, var(--space-xl))' : 0,
        marginTop: isNested ? 'var(--space-sm)' : 'var(--space-md)',
        padding: isNested ? 0 : 'clamp(var(--space-sm), 3vw, var(--space-md))',
        background: isNested ? 'transparent' : 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: reply.is_accepted ? '2px solid var(--neon-green)' : (isNested ? 'none' : '1px solid rgba(255,255,255,0.1)'),
        borderLeft: isNested ? '2px solid rgba(255,255,255,0.1)' : undefined,
        paddingLeft: isNested ? 'clamp(8px, 3vw, var(--space-md))' : 'clamp(var(--space-sm), 3vw, var(--space-md))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
            <img src={reply.author?.avatar_url || DEFAULT_AVATAR} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--glass-border)' }} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
            <div>
              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reply.author?.name} 
                {reply.author?.role !== 'student' && <span style={{ fontSize: '10px', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>Faculty</span>}
                {reply.is_accepted && <span style={{ fontSize: '12px', color: 'var(--neon-green)' }}>✓ Accepted Answer</span>}
              </div>
              <div suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
            <button 
              onClick={() => handleVote(reply.id, 'upvote')} 
              style={{ background: 'transparent', border: 'none', color: userVote === 'upvote' ? 'var(--neon-green)' : 'var(--text-secondary)', cursor: 'pointer', padding: '2px', transition: 'color 0.2s' }}
              title="Upvote"
            >
              ▲
            </button>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: userVote ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{reply.upvotes_count || 0}</span>
            <button 
              onClick={() => handleVote(reply.id, 'downvote')} 
              style={{ background: 'transparent', border: 'none', color: userVote === 'downvote' ? 'var(--neon-pink)' : 'var(--text-secondary)', cursor: 'pointer', padding: '2px', transition: 'color 0.2s' }}
              title="Downvote"
            >
              ▼
            </button>
          </div>
        </div>

        <MarkdownRenderer content={reply.reply_text} />

        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
          {!isNested && (
            <button onClick={() => setActiveReplyId(activeReplyId === reply.id ? null : reply.id)} style={{ background: 'transparent', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              <span style={{ fontSize: '1.2em' }}>💬</span> Reply
            </button>
          )}
          {(isDoubtAuthor || isFaculty) && !reply.is_accepted && !doubt.status.includes('resolved') && !isNested && (
            <button onClick={() => handleAccept(reply.id)} style={{ background: 'transparent', border: 'none', color: 'var(--neon-green)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              <span style={{ fontSize: '1.2em' }}>✓</span> Accept Answer
            </button>
          )}
        </div>

        {activeReplyId === reply.id && (
          <div style={{ marginTop: 'var(--space-md)', padding: '6px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'flex-end', gap: 'var(--space-xs)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ paddingBottom: '4px', paddingLeft: '4px' }}>
              <ImageUploadButton iconOnly onUpload={(markdown) => {
                setReplyText((prev) => prev + (prev ? '\n\n' : '') + markdown);
              }} />
            </div>
            <textarea 
              value={replyText} 
              onChange={e => setReplyText(e.target.value)}
              placeholder="Message..."
              style={{ flex: 1, minHeight: '40px', maxHeight: '120px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', resize: 'none', padding: '10px 8px', fontSize: 'var(--text-md)', lineHeight: 1.4 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(reply.id);
                }
              }}
            />
            <div style={{ paddingBottom: '4px', paddingRight: '4px' }}>
              <button 
                onClick={() => handleSubmit(reply.id)} 
                disabled={isSubmitting || !replyText.trim()}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), #00add8)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: (!replyText.trim() || isSubmitting) ? 0.5 : 1, transition: 'all 0.2s', paddingRight: '2px', boxShadow: '0 4px 12px rgba(0, 242, 254, 0.4)' }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {childrenMap[reply.id]?.map((child: any) => renderReply(child, true))}
      </div>
    );
  };

  return (
    <div style={{ padding: 'clamp(var(--space-xs), 3vw, var(--space-md))' }}>
      {/* Original Doubt */}
      <div className="glass-card" style={{ padding: 'clamp(var(--space-md), 5vw, var(--space-xl))', marginBottom: 'clamp(var(--space-lg), 5vw, var(--space-xl))' }}>
        <h1 style={{ fontSize: 'clamp(var(--text-xl), 5vw, var(--text-2xl))', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>{doubt.title}</h1>
        
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start', marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
          <img src={doubt.author?.avatar_url || DEFAULT_AVATAR} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--neon-cyan)' }} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{doubt.author?.name}</div>
            <div suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })} in {doubt.batch}
            </div>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {doubt.tags?.map((t: any) => (
              <span key={t.tag_name} style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
                {t.tag_name}
              </span>
            ))}
          </div>
        </div>

        <MarkdownRenderer content={doubt.description} />
        
        <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button 
            onClick={handleDoubtLike}
            title="Like this doubt to earn +2 XP ⚡"
            style={{ 
              background: hasLikedDoubt ? 'rgba(255, 59, 92, 0.1)' : 'transparent',
              border: hasLikedDoubt ? '1px solid var(--neon-pink)' : '1px solid rgba(255,255,255,0.2)',
              color: hasLikedDoubt ? 'var(--neon-pink)' : 'var(--text-secondary)',
              padding: '6px 16px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              fontWeight: 500
            }}
          >
            <span style={{ fontSize: '18px' }}>👍</span> 
            {doubt.likes_count || 0} Likes (+2 XP ⚡)
          </button>
        </div>
      </div>

      {/* Replies List */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--text-xl)', borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-sm)' }}>
          {replies.length} Replies
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {topLevel.map(reply => renderReply(reply))}
        </div>
      </div>

      {/* Main Reply Input */}
      {!doubt.status.includes('resolved') && (
        <div style={{ position: 'sticky', bottom: 'var(--space-md)', zIndex: 10, marginTop: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-xs)', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)', padding: '6px', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ paddingBottom: '4px', paddingLeft: '4px' }}>
              <ImageUploadButton iconOnly onUpload={(markdown) => {
                setReplyText((prev) => prev + (prev ? '\n\n' : '') + markdown);
              }} />
            </div>
            <textarea 
              value={replyText} 
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your detailed answer here... (Earn +5 XP ⚡)"
              style={{ flex: 1, minHeight: '40px', maxHeight: '120px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', resize: 'none', padding: '10px 8px', fontSize: 'var(--text-md)', lineHeight: 1.4 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div style={{ paddingBottom: '4px', paddingRight: '4px' }}>
              <button 
                onClick={() => handleSubmit()} 
                disabled={isSubmitting || !replyText.trim()}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), #00add8)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: (!replyText.trim() || isSubmitting) ? 0.5 : 1, transition: 'all 0.2s', paddingRight: '2px', boxShadow: '0 4px 12px rgba(0, 242, 254, 0.4)' }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-sm)', padding: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', display: 'inline-block', left: '50%', position: 'relative', transform: 'translateX(-50%)', border: '1px solid rgba(255,255,255,0.05)' }}>
            Markdown & code blocks supported. Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for new line.
          </div>
        </div>
      )}
    </div>
  );
}
