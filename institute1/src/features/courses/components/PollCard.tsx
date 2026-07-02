'use client';

import React, { useState, useTransition } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatDistanceToNow } from 'date-fns';
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
    if (isExpired) return;
    
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (poll.is_multiple_choice) {
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
      } else {
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  };

  const handleVoteSubmit = () => {
    if (isExpired) return;
    startTransition(async () => {
      const result = await submitPollVote(poll.id, Array.from(selectedOptions), poll.course_id);
      if (result.error) {
        alert(result.error);
      }
    });
  };

  const hasChanged = () => {
    // Check if current selectedOptions differs from original votes
    const originalVotes = new Set<string>();
    poll.options.forEach(opt => {
      if (opt.votes.some(v => v.user_id === currentUserId)) {
        originalVotes.add(opt.id);
      }
    });
    
    if (originalVotes.size !== selectedOptions.size) return true;
    for (const optId of selectedOptions) {
      if (!originalVotes.has(optId)) return true;
    }
    return false;
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
    <Card variant="glass" padding="lg" style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-xs)' }}>{poll.question}</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Asked by {poll.profiles?.name || 'Unknown'} • {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {canDelete && (
            <button 
              onClick={handleDeleteClick} 
              disabled={isDeleting || isPending}
              style={{ background: 'transparent', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Delete Poll"
            >
              <Trash2 size={16} />
            </button>
          )}
          {poll.is_multiple_choice && (
            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
              Multiple Choice
            </span>
          )}
          {isExpired ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-pink)' }}>Ended</span>
          ) : poll.expires_at && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neon-gold)' }}>
              Ends in {formatDistanceToNow(new Date(poll.expires_at))}
            </span>
          )}
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
                padding: 'var(--space-md)',
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
              <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: poll.is_multiple_choice ? '4px' : '50%', border: `2px solid ${isSelected ? 'var(--neon-cyan)' : 'var(--text-muted)'}`, background: isSelected ? 'var(--neon-cyan)' : 'transparent' }}>
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
                  <div style={{ display: 'flex', marginLeft: '8px' }}>
                    {option.votes.slice(0, 3).map((v, i) => (
                      <div 
                        key={v.id} 
                        title={v.profiles?.name || 'User'}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--gradient-xp)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: '#000',
                          border: '2px solid var(--bg-card)',
                          marginLeft: i > 0 ? '-8px' : '0',
                          zIndex: 3 - i
                        }}
                      >
                        {(v.profiles?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Total votes: {totalVotes}
        </span>
        {hasChanged() && !isExpired && (
          <Button variant="primary" size="sm" onClick={handleVoteSubmit} disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit Vote'}
          </Button>
        )}
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
    </Card>
  );
}
