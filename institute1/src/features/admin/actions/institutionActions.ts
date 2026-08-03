'use server';

import { createClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function approveInstitution(requestId: string) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorized: Only Super Admin can approve institutions.' };
    }

    // Since we need to use Admin API to create the user, we will dynamically import it
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the request
    const { data: req, error: reqErr } = await supabaseAdmin
      .from('institution_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !req) {
      return { error: 'Request not found.' };
    }

    if (req.status === 'approved') {
      return { error: 'Request is already approved.' };
    }

    // 1. Create Institution
    const slug = generateSlug(req.institute_name);
    // Determine plan using a mapping or default
    // We'll skip plan mapping right now and do it manually if needed, or query plan by name later.

    const { data: newInst, error: instErr } = await supabaseAdmin
      .from('institutions')
      .insert({
        name: req.institute_name,
        slug: slug,
        domain: `${slug}.smartlearn.ai`,
        status: 'active'
      })
      .select()
      .single();

    if (instErr || !newInst) {
      return { error: `Failed to create institution: ${instErr?.message}` };
    }

    // 2. Create Admin Auth User
    const rawPassword = Math.random().toString(36).slice(-8) + 'A1!'; // random secure string

    const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: req.admin_email,
      email_confirm: true,
      password: rawPassword,
      user_metadata: {
        name: req.admin_name,
        role: 'admin',
        institution_id: newInst.id
      }
    });

    if (userErr && !userErr.message.includes('already registered')) {
        // Handle case where admin exists vs not
        return { error: `Failed to create admin user: ${userErr.message}` };
    }

    // We assume the user profile is created by a database trigger upon auth user creation.
    // However, if the trigger doesn't have `institution_id`, we must update the profile.
    if (newUser?.user?.id) {
       await supabaseAdmin.from('profiles').update({
           role: 'admin',
           institution_id: newInst.id,
           level: 'Expert'
       }).eq('id', newUser.user.id);
    }

    // 3. Update request status
    await supabaseAdmin
      .from('institution_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    revalidatePath('/admin/institutions');
    
    // Optionally: send email with rawPassword via a 3rd party API (Resend/SendGrid)
    
    return { success: true, message: `Approved! Temporary Admin Password: ${rawPassword}` };
  } catch (e: any) {
    return { error: e.message || 'An unexpected error occurred.' };
  }
}

export async function rejectInstitution(requestId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorized.' };
    }
    
    const { error } = await supabase
      .from('institution_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
      
    if (error) return { error: error.message };
    
    revalidatePath('/admin/institutions');
    return { success: true };
  } catch (e: any) {
      return { error: e.message };
  }
}
