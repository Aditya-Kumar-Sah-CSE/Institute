'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { awardXP } from '@/features/auth/actions/auth';
import { SheetReview } from '@/types/database';

export interface SheetReviewStats {
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
 * Submit or update a practice sheet review
 */
export async function submitOrUpdateSheetReviewAction(
  sheetId: string, 
  rating: number, 
  reviewText: string, 
  isPublic: boolean = true
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in to submit feedback.' };
  }

  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Please provide a rating between 1 and 5 stars.' };
  }

  const cleanReviewText = (reviewText || '').trim();
  if (cleanReviewText.length > 2000) {
    return { error: 'Comment must not exceed 2000 characters.' };
  }

  // Rate Limiting: max 5 review submissions per user per 5 minutes
  const rl = checkRateLimit(`submitSheetReview:${user.id}`, 5, 300000);
  if (!rl.success) {
    return { error: rl.error };
  }

  // Check sheet existence
  const { data: sheet } = await supabase.from('coding_sheets').select('id').eq('id', sheetId).single();
  if (!sheet) {
    return { error: 'Practice sheet not found.' };
  }

  // Check if review already exists
  const { data: existingReview } = await supabase
    .from('sheet_reviews')
    .select('id')
    .eq('sheet_id', sheetId)
    .eq('user_id', user.id)
    .maybeSingle();

  const adminSb = await createAdminClient();

  const { error } = await adminSb
    .from('sheet_reviews')
    .upsert({
      sheet_id: sheetId,
      user_id: user.id,
      rating,
      review_text: cleanReviewText || null,
      is_public: isPublic,
      status: 'published',
      updated_at: new Date().toISOString()
    }, { onConflict: 'sheet_id,user_id' });

  if (error) {
    console.error('Error submitting sheet review:', error);
    return { error: error.message };
  }

  // Award 15 XP for first-time practice sheet review
  if (!existingReview) {
    try {
      await awardXP(user.id, 15, 'Submitted Sheet Review', 'sheet_review', sheetId);
    } catch (e) {
      console.error('Failed to award sheet review XP:', e);
    }
  }

  revalidatePath(`/code-arena/sheets/${sheetId}`);
  revalidatePath(`/code-arena/sheets`);
  return { success: true };
}

/**
 * Delete a sheet review (Author or Instructor/Admin)
 */
export async function deleteSheetReviewAction(reviewId: string, sheetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const { data: review } = await supabase
    .from('sheet_reviews')
    .select('user_id, sheet_id')
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
    .from('sheet_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting sheet review:', error);
    return { error: error.message };
  }

  revalidatePath(`/code-arena/sheets/${sheetId}`);
  revalidatePath(`/code-arena/sheets`);
  return { success: true };
}

/**
 * Moderate sheet review status (Instructor / Admin function)
 */
export async function moderateSheetReviewStatusAction(
  reviewId: string, 
  sheetId: string, 
  status: 'published' | 'hidden' | 'flagged'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isStaff = profile && ['admin', 'instructor', 'developer'].includes(profile.role);

  if (!isStaff) {
    return { error: 'Only instructors or admins can moderate reviews.' };
  }

  const adminSb = await createAdminClient();
  const { error } = await adminSb
    .from('sheet_reviews')
    .update({ status })
    .eq('id', reviewId);

  if (error) {
    console.error('Error moderating sheet review:', error);
    return { error: error.message };
  }

  revalidatePath(`/code-arena/sheets/${sheetId}`);
  revalidatePath(`/code-arena/sheets`);
  return { success: true };
}

/**
 * Get sheet review statistics & public reviews list
 */
export async function getSheetReviewsData(sheetId: string, currentUserId?: string) {
  const adminSb = await createAdminClient();

  const { data: reviewsData, error } = await adminSb
    .from('sheet_reviews')
    .select('*, profile:profiles(id, name, avatar_url, role, institute_id)')
    .eq('sheet_id', sheetId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sheet reviews:', error);
  }

  const allReviews: SheetReview[] = (reviewsData || []).map((r: any) => ({
    id: r.id,
    sheet_id: r.sheet_id,
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

/**
 * Batch fetch sheet review aggregate stats for sheet listing grid
 */
export async function getBatchSheetRatingStats(sheetIds: string[]): Promise<Record<string, { averageRating: number; totalReviews: number }>> {
  if (!sheetIds || sheetIds.length === 0) return {};

  const adminSb = await createAdminClient();
  const { data, error } = await adminSb
    .from('sheet_reviews')
    .select('sheet_id, rating')
    .in('sheet_id', sheetIds)
    .eq('status', 'published')
    .eq('is_public', true);

  if (error || !data) {
    return {};
  }

  const aggregates: Record<string, { sum: number; count: number }> = {};
  sheetIds.forEach(id => {
    aggregates[id] = { sum: 0, count: 0 };
  });

  data.forEach((r: any) => {
    if (aggregates[r.sheet_id]) {
      aggregates[r.sheet_id].sum += r.rating;
      aggregates[r.sheet_id].count += 1;
    }
  });

  const result: Record<string, { averageRating: number; totalReviews: number }> = {};
  Object.keys(aggregates).forEach(id => {
    const { sum, count } = aggregates[id];
    result[id] = {
      averageRating: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
      totalReviews: count
    };
  });

  return result;
}
