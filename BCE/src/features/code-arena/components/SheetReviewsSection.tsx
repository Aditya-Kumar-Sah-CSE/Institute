'use client';

import React, { useState } from 'react';
import { SheetReview } from '@/types/database';
import { submitOrUpdateSheetReviewAction, deleteSheetReviewAction, moderateSheetReviewStatusAction } from '../actions/sheet-reviews';
import StarRatingInput from '@/features/courses/components/StarRatingInput';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import UserAvatar from '@/components/shared/UserAvatar';
import { Star, MessageSquare, ShieldAlert, Eye, EyeOff, Trash2, Edit3, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SheetReviewsSectionProps {
  sheetId: string;
  currentUserId?: string;
  isStaff: boolean;
  reviews: SheetReview[];
  userReview: SheetReview | null;
  stats: {
    averageRating: number;
    totalReviews: number;
    breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  };
}

export default function SheetReviewsSection({
  sheetId,
  currentUserId,
  isStaff,
  reviews,
  userReview: initialUserReview,
  stats
}: SheetReviewsSectionProps) {
  const router = useRouter();
  const [userReview, setUserReview] = useState<SheetReview | null>(initialUserReview);
  
  // Review form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(userReview?.rating || 5);
  const [reviewText, setReviewText] = useState<string>(userReview?.review_text || '');
  const [isPublic, setIsPublic] = useState<boolean>(userReview ? userReview.is_public : true);
  
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleOpenForm = () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
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

    const res = await submitOrUpdateSheetReviewAction(sheetId, rating, reviewText, isPublic);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg(userReview ? 'Your review has been updated!' : 'Thank you! Your practice sheet review has been published.');
      setIsFormOpen(false);
      router.refresh();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setIsLoading(true);
    const res = await deleteSheetReviewAction(reviewId, sheetId);
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
    const res = await moderateSheetReviewStatusAction(reviewId, sheetId, newStatus);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Filter reviews
  const displayedReviews = reviews.filter(r => {
    if (r.status !== 'published' && !isStaff && r.user_id !== currentUserId) {
      return false;
    }
    if (filterStar !== null && r.rating !== filterStar) {
      return false;
    }
    return true;
  });

  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const pagedReviews = displayedReviews.slice(0, visibleCount);

  return (
    <Card variant="glass" className="sheet-reviews-section" style={{ padding: 'var(--space-xl)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(11, 15, 25, 0.8))', border: '1px solid rgba(6, 182, 212, 0.2)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              <Star size={26} style={{ color: '#f59e0b', fill: '#f59e0b', filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))' }} /> Sheet Ratings & Feedback
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Community ratings and reviews for this practice coding sheet
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button onClick={handleOpenForm} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 16px rgba(6, 182, 212, 0.3)' }}>
              <Edit3 size={16} /> {userReview ? 'Edit Your Review' : 'Write a Review'}
            </Button>

            <button
              type="button"
              onClick={() => setIsCollapsed(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
              title={isCollapsed ? 'Expand Reviews' : 'Collapse Reviews'}
            >
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {error && <p style={{ color: 'var(--neon-red)', fontSize: 'var(--text-sm)', margin: 0, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</p>}
            {successMsg && <p style={{ color: '#10b981', fontSize: 'var(--text-sm)', margin: 0, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{successMsg}</p>}

        {/* Form Modal / Box */}
        {isFormOpen && (
          <form 
            onSubmit={handleSubmitReview}
            style={{
              padding: 'var(--space-lg)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--neon-cyan)', fontWeight: 800 }}>
              {userReview ? 'Edit Your Sheet Review' : 'Rate & Feedback this Practice Sheet'}
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Your Rating (Select 1 to 5 Stars):
              </label>
              <StarRatingInput value={rating} onChange={setRating} size={30} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Written Review & Feedback (Optional, max 2000 chars):
              </label>
              <textarea
                placeholder="Share your thoughts on question quality, difficulty curve, and solutions..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                disabled={isLoading}
                maxLength={2000}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--text-sm)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={e => setIsPublic(e.target.checked)} 
                  disabled={isLoading} 
                />
                Display my profile name & avatar publicly with this review
              </label>

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <Button type="submit" isLoading={isLoading} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', fontWeight: 800 }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-lg)',
            padding: 'var(--space-lg)',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Average Rating Block */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: 'var(--space-lg)' }}>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {stats.averageRating > 0 ? stats.averageRating : '—'}
            </div>
            <div style={{ margin: '8px 0' }}>
              <StarRatingInput value={Math.round(stats.averageRating)} readOnly size={22} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Based on {stats.totalReviews} user {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Breakdown Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', flex: 1 }}>
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = stats.breakdown[starNum as keyof typeof stats.breakdown] || 0;
              const pct = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
              return (
                <div key={starNum} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                  <span style={{ width: '45px', color: 'var(--text-secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {starNum} <Star size={11} fill="#f59e0b" color="#f59e0b" />
                  </span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ width: '38px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => { setFilterStar(null); setVisibleCount(PAGE_SIZE); }}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: filterStar === null ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255, 255, 255, 0.05)',
              color: filterStar === null ? '#fff' : 'var(--text-secondary)',
              border: filterStar === null ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All Reviews ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStar(filterStar === s ? null : s); setVisibleCount(PAGE_SIZE); }}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                background: filterStar === s ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.05)',
                color: filterStar === s ? '#000' : 'var(--text-secondary)',
                border: filterStar === s ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              {s} ★ ({stats.breakdown[s as keyof typeof stats.breakdown] || 0})
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {displayedReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
              <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                No reviews match your filter yet. Be the first to leave a review!
              </p>
            </div>
          ) : (
            <>
              {pagedReviews.map((r) => {
                const isOwner = r.user_id === currentUserId;
                const isHidden = r.status === 'hidden';

                return (
                  <div 
                    key={r.id}
                    style={{
                      padding: '18px 20px',
                      background: isHidden 
                        ? 'rgba(239, 68, 68, 0.05)' 
                        : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.65) 100%)',
                      borderRadius: '16px',
                      border: isHidden ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.09)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(12px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      {/* User Profile */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <UserAvatar 
                          url={r.is_public ? r.profile?.avatar_url : undefined} 
                          name={r.is_public ? (r.profile?.name || 'Verified Coder') : 'Verified Coder'} 
                          size={42} 
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: '#ffffff' }}>
                              {r.is_public ? (r.profile?.name || 'Verified Coder') : 'Verified Coder'}
                            </span>
                            {r.profile?.role === 'instructor' || r.profile?.role === 'admin' ? (
                              <span style={{ fontSize: '10px', background: 'rgba(176, 38, 255, 0.2)', color: 'var(--neon-purple)', padding: '2px 8px', borderRadius: '10px', fontWeight: 800, border: '1px solid rgba(176, 38, 255, 0.3)' }}>
                                FACULTY
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '10px', fontWeight: 800, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                CODER
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Star Rating & Moderation Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StarRatingInput value={r.rating} readOnly size={18} />
                        
                        {/* Moderation Controls */}
                        {(isStaff || isOwner) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 6px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-line', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '10px', borderLeft: '3px solid #06b6d4' }}>
                        "{r.review_text}"
                      </p>
                    )}

                    {/* Moderation Status Banner if hidden */}
                    {isHidden && (
                      <div style={{ fontSize: '11px', color: 'var(--neon-red)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <ShieldAlert size={12} /> This review is hidden by moderation.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {displayedReviews.length > visibleCount && (
                <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    style={{ borderRadius: '20px', padding: '8px 24px', fontSize: '13px', fontWeight: 700 }}
                  >
                    Load More Reviews ({displayedReviews.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        </>
        )}
      </div>
    </Card>
  );
}
