'use client';

import React, { useState } from 'react';
import StarRatingInput from './StarRatingInput';
import { submitOrUpdateReviewAction } from '../actions/reviews';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Award, Star, CheckCircle, Sparkles, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EndOfCourseReviewCardProps {
  courseId: string;
  courseTitle: string;
  existingRating?: number;
  existingFeedback?: string;
}

export default function EndOfCourseReviewCard({
  courseId,
  courseTitle,
  existingRating = 5,
  existingFeedback = ''
}: EndOfCourseReviewCardProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(existingRating);
  const [feedback, setFeedback] = useState<string>(existingFeedback);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!existingRating && !!existingFeedback);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating (1 to 5 stars).');
      return;
    }

    setIsLoading(true);
    setError('');

    const res = await submitOrUpdateReviewAction(courseId, rating, feedback, true);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setIsSubmitted(true);
      router.refresh();
    }
  };

  return (
    <Card 
      variant="glass" 
      style={{
        padding: 'var(--space-xl)',
        border: '1px solid rgba(255, 215, 0, 0.4)',
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.2)',
            color: 'var(--neon-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)'
          }}>
            🎓
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--neon-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Congratulations on Progressing in {courseTitle}! <Sparkles size={16} />
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              How was your learning experience? Leave a review to earn 25 bonus XP and help fellow students!
            </p>
          </div>
        </div>

        {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}

        {isSubmitted ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <CheckCircle size={20} style={{ color: '#10b981' }} />
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#10b981' }}>Review Published!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  You rated this course {rating} ★. Thank you for your feedback!
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setIsSubmitted(false)}>
              Edit Feedback
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Course Rating:
              </label>
              <StarRatingInput value={rating} onChange={setRating} size={24} />
            </div>

            <div>
              <textarea
                placeholder="Write your feedback... What did you enjoy? What could be improved?"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                disabled={isLoading}
                rows={3}
                style={{
                  width: '100%',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--text-sm)'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" isLoading={isLoading} style={{ backgroundColor: 'var(--neon-gold)', color: '#000', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} /> Submit Feedback
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
