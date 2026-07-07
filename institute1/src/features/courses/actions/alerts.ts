'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCourseAlert(
  courseId: string, 
  type: 'cancel' | 'asap' | 'custom',
  description: string, 
  expiresInHours: number = 12
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const { data: alert, error: alertError } = await supabase
      .from('course_alerts')
      .insert({
        course_id: courseId,
        created_by: user.id,
        type,
        description,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (alertError || !alert) throw alertError || new Error('Failed to create alert');

    revalidatePath(`/courses/${courseId}`);
    return { success: true, alert };
  } catch (error: any) {
    console.error('Error creating alert:', error);
    return { error: error.message || 'Failed to create alert' };
  }
}

export async function getCourseAlerts(courseId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('course_alerts')
    .select(`
      *,
      profiles:created_by ( name )
    `)
    .eq('course_id', courseId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getDashboardAlerts(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return { data: null, error: null };
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('course_alerts')
    .select(`
      *,
      courses ( title ),
      profiles:created_by ( name )
    `)
    .in('course_id', courseIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dashboard alerts:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteCourseAlert(alertId: string, courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('course_alerts')
      .delete()
      .eq('id', alertId);

    if (error) throw error;

    revalidatePath(`/courses/${courseId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting alert:', error);
    return { error: error.message || 'Failed to delete alert' };
  }
}
