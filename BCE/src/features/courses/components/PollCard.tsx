'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Modal from '@/components/ui/Modal';
import { formatDistanceToNow } from 'date-fns';
import { User } from 'lucide-react';
import { submitPollVote, deleteCoursePoll } from '../actions/polls';
import { Trash2 } from 'lucide-react';

interface PollOption {
  id: string;
  option_text: string;
  votes: {
    id: string;
    user_id: string;
    profiles?: { name: string } | null;
  }[];
}

export interface Poll {
  id: string;
  course_id: string;
  created_by: string;
  question: string;
  is_multiple_choice: boolean;
  expires_at: string | null;
  created_at: string;
  profiles?: { name: string } | null;
  options: PollOption[];
}

interface PollCardProps {
  poll: Poll;
  currentUserId: string;
  isFaculty?: boolean;
}

export default function PollCard({ poll, currentUserId, isFaculty = false }: PollCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    poll.options.forEach(opt => {
      if (opt.votes.some(v => v.user_id === currentUserId)) {
        initial.add(opt.id);
      }
    });
    return initial;
  });

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;

  const handleOptionChange = (optionId: string) => {
    if (isExpired || isPending) return;
    
    const nextSet = new Set(selectedOptions);
    if (poll.is_multiple_choice) {
      if (nextSet.has(optionId)) nextSet.delete(optionId);
      else nextSet.add(optionId);
    } else {
      nextSet.clear();
      nextSet.add(optionId);
    }
    
    // Update local state instantly for optimistic UI
    setSelectedOptions(nextSet);

    // Auto-submit vote to server
    startTransition(async () => {
      const result = await submitPollVote(poll.id, Array.from(nextSet), poll.course_id);
      if (result.error) {
        alert(result.error);
      }
    });
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteCoursePoll(poll.id, poll.course_id);
      if (result.error) {
        alert(result.error);
        setIsDeleting(false);
      }
      setShowConfirm(false);
    });
  };

  const canDelete = isFaculty || poll.created_by === currentUserId;

  return (
    <Card className="poll-card" variant="glass" padding="md" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.4)', boxShadow: '0 4px 20px rgba(46, 204, 113, 0.1)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', wordBreak: 'break-word', lineHeight: 1.3, margin: 0, width: '100%' }}>
          {poll.question}
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ flex: '1 1 30%', display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Asked by {poll.profiles?.name || 'Unknown'}
            </span>
          </div>

          <div style={{ flex: '1 1 30%', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isExpired ? (
              <span style={{ color: 'var(--neon-pink)', fontWeight: 500, fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>Ended</span>
            ) : poll.expires_at && (
              <span suppressHydrationWarning style={{ color: 'var(--neon-gold)', fontWeight: 500, fontSize: 'var(--text-xs)', background: 'rgba(255, 215, 0, 0.1)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', whiteSpace: 'nowrap' }}>
                Ends in {formatDistanceToNow(new Date(poll.expires_at))}
              </span>
            )}

            {poll.is_multiple_choice && (
              <span style={{ padding: '0.125rem 0.375rem', background: 'var(--bg-input)', borderRadius: '0.75rem', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                Multiple Choice
              </span>
            )}
          </div>

          <div style={{ flex: '1 1 30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            <span suppressHydrationWarning style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
              {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
            </span>
            
            {canDelete && (
              <button 
                onClick={handleDeleteClick} 
                disabled={isDeleting || isPending}
                style={{ background: 'transparent', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', transition: 'opacity 0.2s ease', flexShrink: 0 }}
                title="Delete Poll"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {poll.options.map(option => {
          const voteCount = option.votes.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = selectedOptions.has(option.id);
          
          return (
            <div 
              key={option.id}
              onClick={() => handleOptionChange(option.id)}
              style={{
                position: 'relative',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                cursor: isExpired ? 'default' : 'pointer',
                border: `1px solid ${isSelected ? 'var(--neon-cyan)' : 'transparent'}`,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)'
              }}
            >
              {/* Progress bar background */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${percentage}%`,
                  background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  zIndex: 0,
                  transition: 'width 0.5s ease'
                }}
              />
              
              {/* Checkbox / Radio */}
              <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', borderRadius: poll.is_multiple_choice ? '0.25rem' : '50%', border: `2px solid ${isSelected ? 'var(--neon-cyan)' : 'var(--text-muted)'}`, background: isSelected ? 'var(--neon-cyan)' : 'transparent' }}>
                {isSelected && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
              </div>

              {/* Option Text */}
              <span style={{ zIndex: 1, flex: 1, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {option.option_text}
              </span>

              {/* Vote Count / Avatars */}
              <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{percentage}%</span>
                {voteCount > 0 && (
                  <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                    {option.votes.slice(0, 3).map((v, i) => (
                      <div 
                        key={v.id} 
                        title={v.profiles?.name || 'User'}
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          background: 'var(--gradient-xp)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.625rem',
                          fontWeight: 'bold',
                          color: '#000',
                          border: '2px solid var(--bg-card)',
                          marginLeft: i > 0 ? '-0.5rem' : '0',
                          zIndex: 3 - i
                        }}
                      >
                        <User size={14} opacity={0.8} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Total votes: {totalVotes}
          </span>
          {totalVotes > 0 && (
            <button
              onClick={() => setShowVotesModal(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 }}
            >
              View votes
            </button>
          )}
        </div>

      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Poll"
        message="Are you sure you want to delete this poll? This cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        isPending={isDeleting}
      />

      <Modal isOpen={showVotesModal} onClose={() => setShowVotesModal(false)} title="Poll Votes" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
          {poll.options.map(option => (
            <div key={option.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{option.option_text}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                </span>
              </div>
              {option.votes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: 'var(--space-xs)' }}>
                  {option.votes.map(vote => (
                    <div key={vote.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontSize: '0.75rem', border: '1px solid var(--glass-border)' }}>
                        {(vote.profiles?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 'var(--text-sm)', color: vote.user_id === currentUserId ? 'var(--neon-cyan)' : 'var(--text-secondary)', fontWeight: vote.user_id === currentUserId ? 500 : 400 }}>
                        {vote.user_id === currentUserId ? 'You' : vote.profiles?.name || 'Unknown User'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', paddingLeft: 'var(--space-xs)' }}>No votes yet</span>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </Card>
  );
}
