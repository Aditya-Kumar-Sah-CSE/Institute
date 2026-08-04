'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function submitInstitutionRequest(formData: FormData) {
  try {
    const supabase = await createAdminClient();

    const data = {
      institute_name: formData.get('institute_name') as string,
      admin_name: formData.get('admin_name') as string,
      admin_email: formData.get('admin_email') as string,
      admin_password: formData.get('admin_password') as string,
      phone: formData.get('phone') as string,
      students_count: parseInt(formData.get('students_count') as string || '0', 10),
      faculty_count: parseInt(formData.get('faculty_count') as string || '0', 10),
      plan_selected: formData.get('plan_selected') as string,
      message: formData.get('message') as string,
    };

    if (!data.institute_name || !data.admin_name || !data.admin_email || !data.admin_password) {
      return { error: 'Please fill out all required fields.' };
    }

    // 1. Generate unique slug
    const baseSlug = data.institute_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase.from('institutions').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';
    const primary_domain = `${slug}.${ROOT_DOMAIN}`;

    // 1.5 Handle Logo Upload
    const logoFile = formData.get('logo') as File | null;
    let logoUrl = null;
    
    if (logoFile && logoFile.size > 0 && logoFile.name) {
      const arrayBuffer = await logoFile.arrayBuffer();
      // Server action uses native node fetch / Supabase storage upload which accepts ArrayBuffer or Buffer
      const fileName = `logo-${Date.now()}-${slug}-${Math.random().toString(36).substring(7)}${logoFile.name.substring(logoFile.name.lastIndexOf('.'))}`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('branding')
        .upload(fileName, arrayBuffer, {
          contentType: logoFile.type,
          upsert: false
        });
        
      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(fileName);
        logoUrl = publicUrlData.publicUrl;
      }
    }

    // Store Logo in storage but save the URL in the pending request row
    // 2. Queue the request as pending
    // baseSlug is already defined above
    
    const requestRow = {
      institute_name: data.institute_name,
      admin_name: data.admin_name,
      admin_email: data.admin_email,
      phone: data.phone,
      students_count: data.students_count,
      faculty_count: data.faculty_count,
      plan_selected: data.plan_selected,
      message: data.message,
      logo_url: logoUrl,
      status: 'pending'
    };

    const { error: reqErr } = await supabase.from('institution_requests').insert([requestRow]);

    if (reqErr) {
      return { error: `Failed to submit request: ${reqErr.message}` };
    }

    return { success: true, message: 'Your application has been received and is pending Super Admin review.' };
  } catch (e: any) {
    return { error: e.message || 'An unexpected error occurred' };
  }
}
