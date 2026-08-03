'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function submitInstitutionRequest(formData: FormData) {
  try {
    const supabase = await createAdminClient();

    const data = {
      institute_name: formData.get('institute_name') as string,
      admin_name: formData.get('admin_name') as string,
      admin_email: formData.get('admin_email') as string,
      phone: formData.get('phone') as string,
      students_count: parseInt(formData.get('students_count') as string || '0', 10),
      faculty_count: parseInt(formData.get('faculty_count') as string || '0', 10),
      plan_selected: formData.get('plan_selected') as string,
      message: formData.get('message') as string,
      status: 'pending'
    };

    // Very basic validation
    if (!data.institute_name || !data.admin_name || !data.admin_email) {
      return { error: 'Please fill out all required fields.' };
    }

    const { error } = await supabase.from('institution_requests').insert([data]);

    if (error) {
      console.error('Error inserting institution request:', error);
      return { error: 'Failed to submit application. Please try again later.' };
    }

    // Ideally, send email to superadmin here.
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'An unexpected error occurred' };
  }
}
