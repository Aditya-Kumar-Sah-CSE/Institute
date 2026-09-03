'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { awardXP } from '@/features/auth/actions/auth';
import { CourseReview } from '@/types/database';

export interface CourseReviewStats {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Submit or update a course review
 */
export async function submitOrUpdateReviewAction(
  courseId: string, 
  rating: number, 
  reviewText: string, 
  isPublic: boolean = true
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in to submit feedback.' };
  }

  if (!rating || rating < 1 || rating > 5) {
    return { error: 'Please provide a rating between 1 and 5 stars.' };
  }

  // Rate Limiting: max 5 review submissions per user per 5 minutes
  const rl = checkRateLimit(`submitReview:${user.id}`, 5, 300000);
  if (!rl.success) {
    return { error: rl.error };
  }

  // Check enrollment or course ownership authorization
  const { data: course } = await supabase.from('courses').select('created_by').eq('id', courseId).single();
  const isCourseOwner = course?.created_by === user.id;

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('status')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .maybeSingle();

  const isEnrolled = enrollment?.status === 'approved';

  if (!isEnrolled && !isCourseOwner) {
    return { error: 'Only enrolled students can submit feedback for this course.' };
  }

  // Check if review already exists
  const { data: existingReview } = await supabase
    .from('course_reviews')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .maybeSingle();

  const adminSb = await createAdminClient();
  const cleanReviewText = (reviewText || '').trim();

  const { error } = await adminSb
    .from('course_reviews')
    .upsert({
      course_id: courseId,
      user_id: user.id,
      rating,
      review_text: cleanReviewText || null,
      is_public: isPublic,
      status: 'published',
      updated_at: new Date().toISOString()
    }, { onConflict: 'course_id,user_id' });

  if (error) {
    console.error('Error submitting course review:', error);
    return { error: error.message };
  }

  // Award 25 XP for first-time course feedback
  if (!existingReview) {
    try {
      await awardXP(user.id, 25, 'Submitted Course Review', 'course_review', courseId);
    } catch (e) {
      console.error('Failed to award review XP:', e);
    }
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

/**
 * Delete a course review (Author or Instructor/Admin)
 */
export async function deleteReviewAction(reviewId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const { data: review } = await supabase
    .from('course_reviews')
    .select('user_id, course_id')
    .eq('id', reviewId)
    .single();

  if (!review) {
    return { error: 'Review not found.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isStaff = profile && ['admin', 'instructor', 'developer'].includes(profile.role);
  const isAuthor = review.user_id === user.id;

  if (!isAuthor && !isStaff) {
    return { error: 'Not authorized to delete this review.' };
  }

  const adminSb = await createAdminClient();
  const { error } = await adminSb
    .from('course_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting course review:', error);
    return { error: error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

/**
 * Moderate review status (Instructor / Admin function)
 */
export async function moderateReviewStatusAction(
  reviewId: string, 
  courseId: string, 
  status: 'published' | 'hidden' | 'flagged'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const { data: course } = await supabase.from('courses').select('created_by').eq('id', courseId).single();

  const isStaff = profile && ['admin', 'instructor', 'developer'].includes(profile.role);
  const isCourseOwner = course?.created_by === user.id;

  if (!isStaff && !isCourseOwner) {
    return { error: 'Only course instructors or admins can moderate reviews.' };
  }

  const adminSb = await createAdminClient();
  const { error } = await adminSb
    .from('course_reviews')
    .update({ status })
    .eq('id', reviewId);

  if (error) {
    console.error('Error moderating course review:', error);
    return { error: error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  return { success: true };
}

/**
 * Get course review statistics & public reviews list
 */
export async function getCourseReviewsData(courseId: string, currentUserId?: string) {
  const adminSb = await createAdminClient();

  // Fetch all reviews for this course with reviewer profile details
  const { data: reviewsData, error } = await adminSb
    .from('course_reviews')
    .select('*, profile:profiles(id, name, avatar_url, role, institute_id)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching course reviews:', error);
  }

  const allReviews: CourseReview[] = (reviewsData || []).map((r: any) => ({
    id: r.id,
    course_id: r.course_id,
    user_id: r.user_id,
    rating: r.rating,
    review_text: r.review_text,
    status: r.status,
    is_public: r.is_public,
    created_at: r.created_at,
    updated_at: r.updated_at,
    profile: r.profile ? {
      id: r.profile.id,
      name: r.profile.name,
      avatar_url: r.profile.avatar_url,
      role: r.profile.role,
      institute_id: r.profile.institute_id
    } : null
  }));

  // Aggregate Stats
  const publishedReviews = allReviews.filter(r => r.status === 'published' && r.is_public);
  const totalReviews = publishedReviews.length;

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sumRating = 0;

  publishedReviews.forEach(r => {
    sumRating += r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      breakdown[r.rating as keyof typeof breakdown]++;
    }
  });

  const averageRating = totalReviews > 0 ? parseFloat((sumRating / totalReviews).toFixed(1)) : 0;

  // Filter reviews visible to user based on status & current user identity
  const userReview = currentUserId ? allReviews.find(r => r.user_id === currentUserId) : null;

  return {
    reviews: allReviews,
    publishedReviews,
    userReview,
    stats: {
      averageRating,
      totalReviews,
      breakdown
    }
  };
}
