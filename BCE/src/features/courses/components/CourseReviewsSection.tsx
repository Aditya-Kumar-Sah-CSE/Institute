'use client';

import React, { useState } from 'react';
import { CourseReview } from '@/types/database';
import { submitOrUpdateReviewAction, deleteReviewAction, moderateReviewStatusAction } from '../actions/reviews';
import StarRatingInput from './StarRatingInput';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UserAvatar from '@/components/shared/UserAvatar';
import { Star, MessageSquare, ShieldAlert, Eye, EyeOff, Trash2, Edit3, CheckCircle, Sparkles, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CourseReviewsSectionProps {
  courseId: string;
  currentUserId?: string;
  isEnrolled: boolean;
  isStaff: boolean;
  reviews: CourseReview[];
  userReview: CourseReview | null;
  stats: {
    averageRating: number;
    totalReviews: number;
    breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  };
}

export default function CourseReviewsSection({
  courseId,
  currentUserId,
  isEnrolled,
  isStaff,
  reviews,
  userReview: initialUserReview,
  stats
}: CourseReviewsSectionProps) {
  const router = useRouter();
  const [userReview, setUserReview] = useState<CourseReview | null>(initialUserReview);
  
  // Review form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(userReview?.rating || 5);
  const [reviewText, setReviewText] = useState<string>(userReview?.review_text || '');
  const [isPublic, setIsPublic] = useState<boolean>(userReview ? userReview.is_public : true);
  
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleOpenForm = () => {
    setRating(userReview?.rating || 5);
    setReviewText(userReview?.review_text || '');
    setIsPublic(userReview ? userReview.is_public : true);
    setIsFormOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating (1–5 stars).');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const res = await submitOrUpdateReviewAction(courseId, rating, reviewText, isPublic);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(userReview ? 'Your review has been updated!' : 'Thank you! Your course review has been published.');
      setIsFormOpen(false);
      router.refresh();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setIsLoading(true);
    const res = await deleteReviewAction(reviewId, courseId);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      if (userReview?.id === reviewId) {
        setUserReview(null);
      }
      router.refresh();
    }
  };

  const handleModerateStatus = async (reviewId: string, newStatus: 'published' | 'hidden' | 'flagged') => {
    setIsLoading(true);
    const res = await moderateReviewStatusAction(reviewId, courseId, newStatus);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Filter reviews
  const displayedReviews = reviews.filter(r => {
    // Hidden/flagged reviews visible only to staff or review author
    if (r.status !== 'published' && !isStaff && r.user_id !== currentUserId) {
      return false;
    }
    if (filterStar !== null && r.rating !== filterStar) {
      return false;
    }
    return true;
  });

  return (
    <Card variant="glass" className="course-reviews-section" style={{ padding: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={24} style={{ color: '#f59e0b', fill: '#f59e0b' }} /> Course Feedback & Student Reviews
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Real reviews from enrolled students who completed course modules
            </p>
          </div>

          {isEnrolled && (
            <Button onClick={handleOpenForm} style={{ backgroundColor: 'var(--neon-gold)', color: '#000', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={16} /> {userReview ? 'Edit Your Review' : 'Write a Review'}
            </Button>
          )}
        </div>

        {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>}
        {successMsg && <p style={{ color: '#10b981', fontSize: 'var(--text-sm)', margin: 0 }}>{successMsg}</p>}

        {/* Form Modal / Box */}
        {isFormOpen && (
          <form 
            onSubmit={handleSubmitReview}
            style={{
              padding: 'var(--space-lg)',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.06) 0%, rgba(6, 182, 212, 0.06) 100%)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--neon-gold)' }}>
              {userReview ? 'Edit Your Course Review' : 'Leave Course Rating & Feedback'}
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Your Rating (1 to 5 Stars):
              </label>
              <StarRatingInput value={rating} onChange={setRating} size={28} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Written Review & Feedback:
              </label>
              <textarea
                placeholder="Share your learning experience, course content quality, instructor clarity, and key takeaways..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                disabled={isLoading}
                rows={4}
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={e => setIsPublic(e.target.checked)} 
                  disabled={isLoading} 
                />
                Display my profile name & avatar publicly with this review
              </label>

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <Button type="submit" isLoading={isLoading} style={{ backgroundColor: 'var(--neon-gold)', color: '#000', fontWeight: 700 }}>
                  Submit Review
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Stats Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-lg)',
            padding: 'var(--space-lg)',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)'
          }}
        >
          {/* Average Rating Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid var(--glass-border)', paddingRight: 'var(--space-lg)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
              {stats.averageRating > 0 ? stats.averageRating : '—'}
            </div>
            <div style={{ margin: '8px 0' }}>
              <StarRatingInput value={Math.round(stats.averageRating)} readOnly size={20} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Based on {stats.totalReviews} student {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Breakdown Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', flex: 1 }}>
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = stats.breakdown[starNum as keyof typeof stats.breakdown] || 0;
              const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
              return (
                <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ width: '45px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {starNum} <Star size={10} fill="#f59e0b" color="#f59e0b" />
                  </span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                  </div>
                  <span style={{ width: '35px', textAlign: 'right', color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} /> Filter:
          </span>
          <button
            onClick={() => setFilterStar(null)}
            style={{
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 600,
              background: filterStar === null ? 'var(--neon-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: filterStar === null ? '#000' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStar(filterStar === s ? null : s)}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                background: filterStar === s ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                color: filterStar === s ? '#000' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              {s} ★ ({stats.breakdown[s as keyof typeof stats.breakdown] || 0})
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {displayedReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
              <MessageSquare size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                No public reviews match your filter yet.
              </p>
            </div>
          ) : (
            displayedReviews.map((r) => {
              const isOwner = r.user_id === currentUserId;
              const isHidden = r.status === 'hidden';
              const isFlagged = r.status === 'flagged';

              return (
                <div 
                  key={r.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: isHidden ? 'rgba(239, 68, 68, 0.04)' : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    border: isHidden ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    {/* User Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <UserAvatar 
                        url={r.is_public ? r.profile?.avatar_url : undefined} 
                        name={r.is_public ? (r.profile?.name || 'Verified Student') : 'Enrolled Student'} 
                        size={36} 
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            {r.is_public ? (r.profile?.name || 'Verified Student') : 'Enrolled Student'}
                          </span>
                          {r.profile?.role === 'instructor' || r.profile?.role === 'admin' ? (
                            <span style={{ fontSize: '10px', background: 'rgba(176, 38, 255, 0.2)', color: 'var(--neon-purple)', padding: '2px 6px', borderRadius: '8px', fontWeight: 800 }}>
                              FACULTY
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                              VERIFIED ENROLLED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Star Rating & Moderation Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <StarRatingInput value={r.rating} readOnly size={16} />
                      
                      {/* Moderation Controls for Instructor / Admin */}
                      {(isStaff || isOwner) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isStaff && (
                            <>
                              {r.status === 'published' ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleModerateStatus(r.id, 'hidden')} 
                                  title="Hide Review (Instructor Moderation)"
                                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--text-muted)' }}
                                >
                                  <EyeOff size={13} /> Hide
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleModerateStatus(r.id, 'published')} 
                                  title="Publish Review"
                                  style={{ padding: '4px 8px', fontSize: '11px', color: '#10b981' }}
                                >
                                  <Eye size={13} /> Publish
                                </Button>
                              )}
                            </>
                          )}

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteReview(r.id)} 
                            title="Delete Review"
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--neon-red)' }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review Text */}
                  {r.review_text && (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {r.review_text}
                    </p>
                  )}

                  {/* Moderation Status Banner if hidden */}
                  {isHidden && (
                    <div style={{ fontSize: '11px', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldAlert size={12} /> This review is hidden by course moderation.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
