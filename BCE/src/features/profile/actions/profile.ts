'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Qualification, WorkExperience, ExternalCertificate } from '@/types/database';

/**
 * Server action to update user qualifications
 */
export async function updateQualificationsAction(qualifications: Qualification[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  // Validate format
  const sanitized = qualifications.map(q => ({
    id: q.id || crypto.randomUUID(),
    degree: (q.degree || '').trim(),
    institution: (q.institution || '').trim(),
    year: (q.year || '').trim(),
    fieldOfStudy: (q.fieldOfStudy || '').trim(),
    grade: (q.grade || '').trim()
  })).filter(q => q.degree && q.institution);

  const { error } = await supabase
    .from('profiles')
    .update({ qualifications: sanitized })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating qualifications:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
  return { success: true };
}

/**
 * Server action to update user work experience
 */
export async function updateWorkExperienceAction(workExperience: WorkExperience[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const sanitized = workExperience.map(w => ({
    id: w.id || crypto.randomUUID(),
    title: (w.title || '').trim(),
    company: (w.company || '').trim(),
    startDate: (w.startDate || '').trim(),
    endDate: w.current ? 'Present' : (w.endDate || '').trim(),
    current: !!w.current,
    description: (w.description || '').trim()
  })).filter(w => w.title && w.company);

  const { error } = await supabase
    .from('profiles')
    .update({ work_experience: sanitized })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating work experience:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
  return { success: true };
}

/**
 * Server action to update user skills and interests tags
 */
export async function updateSkillsAndInterestsAction(skills: string[], interests: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const cleanSkills = Array.from(new Set(skills.map(s => s.trim()).filter(Boolean)));
  const cleanInterests = Array.from(new Set(interests.map(i => i.trim()).filter(Boolean)));

  const { error } = await supabase
    .from('profiles')
    .update({ 
      skills: cleanSkills, 
      interests: cleanInterests 
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating skills and interests:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
  return { success: true };
}

/**
 * Server action to update user external certificates
 */
export async function updateExternalCertificatesAction(externalCertificates: ExternalCertificate[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const sanitized = externalCertificates.map(c => ({
    id: c.id || crypto.randomUUID(),
    title: (c.title || '').trim(),
    issuer: (c.issuer || '').trim(),
    date: (c.date || '').trim(),
    credentialUrl: (c.credentialUrl || '').trim(),
    fileUrl: (c.fileUrl || '').trim()
  })).filter(c => c.title && c.issuer);

  const { error } = await supabase
    .from('profiles')
    .update({ external_certificates: sanitized })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating external certificates:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/users/${user.id}`);
  return { success: true };
}

/**
 * Server action to upload certificate PDF or image document
 */
export async function uploadCertificateFileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const file = formData.get('file') as File;
  if (!file || file.size === 0) {
    return { error: 'No file provided.' };
  }

  // Max 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'File size exceeds 10MB limit.' };
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only PDF or image files (JPG, PNG, WEBP) are allowed.' };
  }

  const adminSb = await createAdminClient();
  const fileExt = file.name.split('.').pop() || 'pdf';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${user.id}/certificates/cert_${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await adminSb.storage
    .from('attachments')
    .upload(filePath, file, { 
      contentType: file.type,
      upsert: true 
    });

  if (uploadError) {
    console.error('Certificate upload error:', uploadError);
    return { error: uploadError.message };
  }

  const { data: { publicUrl } } = adminSb.storage
    .from('attachments')
    .getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}
