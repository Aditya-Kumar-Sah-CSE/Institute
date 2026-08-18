'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkBadges } from '@/features/gamification/actions/gamification';

// Authorization helper — verifies admin or instructor role
async function requireCourseRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, institute_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor' && profile.role !== 'developer')) {
    throw new Error('Unauthorized: admin, instructor, or developer role required');
  }

  return { supabase, user, role: profile.role, instituteId: profile.institute_id };
}

export async function addCourse(formData: FormData) {
  let supabase, user, instituteId;
  try {
    const roleCheck = await requireCourseRole();
    supabase = roleCheck.supabase;
    user = roleCheck.user;
    instituteId = roleCheck.instituteId;
  } catch (err: any) {
    return { error: err.message || 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const difficulty = formData.get('difficulty') as string;
  const is_published = formData.get('is_published') === 'true';
  const enrollment_restriction = (formData.get('enrollment_restriction') as string) || 'any';

  const instructorIdsString = formData.get('instructor_ids') as string;
  const rawInstructorIds: string[] = instructorIdsString 
    ? JSON.parse(instructorIdsString) 
    : [user?.id].filter(Boolean) as string[];

  // Normalize selected user IDs in a unique array
  const instructorIds = Array.from(new Set(rawInstructorIds));

  if (!title) return { error: 'Title is required' };

  // Validate every selected user
  if (instructorIds.length > 0) {
    const { data: validatedProfiles, error: valError } = await supabase
      .from('profiles')
      .select('id, role, institute_id')
      .in('id', instructorIds);

    if (valError) {
      return { error: 'Faculty validation error: ' + valError.message };
    }

    if (!validatedProfiles || validatedProfiles.length !== instructorIds.length) {
      return { error: 'One or more selected faculty/admin users do not exist.' };
    }

    for (const p of validatedProfiles) {
      const roleLower = (p.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'instructor' && roleLower !== 'developer' && roleLower !== 'faculty') {
        return { error: `User is not an Instructor or Admin.` };
      }
      if (instituteId && p.institute_id !== instituteId) {
        return { error: `Selected faculty member does not belong to the current institute.` };
      }
    }
  }

  const { data: newCourse, error } = await supabase.from('courses').insert({
    title,
    description,
    difficulty,
    is_published,
    enrollment_restriction,
    created_by: user?.id,
  }).select('id').single();

  if (error) return { error: error.message };

  if (newCourse && instructorIds.length > 0) {
    const instructorInserts = instructorIds.map(instructorId => ({
      course_id: newCourse.id,
      instructor_id: instructorId
    }));
    const { error: linkError } = await supabase.from('course_instructors').insert(instructorInserts);
    if (linkError) return { error: linkError.message };
  }

  if (user?.id) {
    await checkBadges(user.id);
  }

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  let supabase, user, instituteId;
  try {
    const roleCheck = await requireCourseRole();
    supabase = roleCheck.supabase;
    user = roleCheck.user;
    instituteId = roleCheck.instituteId;
  } catch (err: any) {
    return { error: err.message || 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const difficulty = formData.get('difficulty') as string;
  const is_published = formData.get('is_published') === 'true';
  const enrollment_restriction = (formData.get('enrollment_restriction') as string) || 'any';

  const instructorIdsString = formData.get('instructor_ids') as string;
  const rawInstructorIds: string[] = instructorIdsString ? JSON.parse(instructorIdsString) : [];

  // Normalize selected user IDs in a unique array
  const instructorIds = Array.from(new Set(rawInstructorIds));

  // Validate every selected user
  if (instructorIds.length > 0) {
    const { data: validatedProfiles, error: valError } = await supabase
      .from('profiles')
      .select('id, role, institute_id')
      .in('id', instructorIds);

    if (valError) {
      return { error: 'Faculty validation error: ' + valError.message };
    }

    if (!validatedProfiles || validatedProfiles.length !== instructorIds.length) {
      return { error: 'One or more selected faculty/admin users do not exist.' };
    }

    for (const p of validatedProfiles) {
      const roleLower = (p.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'instructor' && roleLower !== 'developer' && roleLower !== 'faculty') {
        return { error: `User is not an Instructor or Admin.` };
      }
      if (instituteId && p.institute_id !== instituteId) {
        return { error: `Selected faculty member does not belong to the current institute.` };
      }
    }
  }

  const { error } = await supabase.from('courses').update({
    title,
    description,
    difficulty,
    is_published,
    enrollment_restriction,
  }).eq('id', id);

  if (error) return { error: error.message };

  // Update course_instructors join table by deleting old and inserting new
  const { error: deleteError } = await supabase.from('course_instructors').delete().eq('course_id', id);
  if (deleteError) return { error: deleteError.message };

  if (instructorIds.length > 0) {
    const instructorInserts = instructorIds.map(instructorId => ({
      course_id: id,
      instructor_id: instructorId
    }));
    const { error: linkError } = await supabase.from('course_instructors').insert(instructorInserts);
    if (linkError) return { error: linkError.message };
  }

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function deleteCourse(id: string) {
  const { supabase } = await requireCourseRole();

  // Soft delete the course
  const { error } = await supabase.from('courses').update({
    is_deleted: true,
    is_published: false
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function restoreCourse(id: string) {
  const { supabase } = await requireCourseRole();

  // Restore the course
  const { error } = await supabase.from('courses').update({
    is_deleted: false
  }).eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/courses');
  revalidatePath('/instructor/courses');
  return { success: true };
}

export async function getEligibleFaculty(search?: string, includeIds?: string[]) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('institute_id')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return { error: 'User profile not found' };
    }

    const tenantId = currentProfile.institute_id;

    // Roles permitted for courses
    let query = supabase
      .from('profiles')
      .select('id, name, email, role, institute_id')
      .in('role', ['instructor', 'admin', 'developer', 'faculty', 'Instructor', 'Admin', 'Developer', 'Faculty']);

    if (tenantId) {
      query = query.eq('institute_id', tenantId);
    }

    // Add search conditions
    if (search && search.trim() !== '') {
      const searchPattern = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }

    const { data: matchingProfiles, error: fetchError } = await query;
    if (fetchError) {
      return { error: fetchError.message };
    }

    let result = matchingProfiles || [];

    // Ensure includeIds are fully fetched and merged if they aren't in the search results
    if (includeIds && includeIds.length > 0) {
      const missingIds = includeIds.filter(id => !result.some(p => p.id === id));
      if (missingIds.length > 0) {
        let includeQuery = supabase
          .from('profiles')
          .select('id, name, email, role, institute_id')
          .in('id', missingIds);

        if (tenantId) {
          includeQuery = includeQuery.eq('institute_id', tenantId);
        }

        const { data: includedProfiles } = await includeQuery;
        if (includedProfiles) {
          result = [...result, ...includedProfiles];
        }
      }
    }

    // Deduplicate profiles by ID and email
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const deduplicated: any[] = [];

    for (const p of result) {
      const emailLower = (p.email || '').toLowerCase().trim();
      if (!seenIds.has(p.id) && !seenEmails.has(emailLower)) {
        seenIds.add(p.id);
        seenEmails.add(emailLower);
        deduplicated.push({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          institute_id: p.institute_id
        });
      }
    }

    deduplicated.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { faculty: deduplicated };
  } catch (err: any) {
    return { error: err.message || 'An error occurred fetching faculty' };
  }
}
