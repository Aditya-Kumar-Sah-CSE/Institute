'use server';

import { createClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function generateUniqueSlug(supabaseAdmin: any, baseSlug: string) {
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (true) {
    const { data } = await supabaseAdmin.from('institutions').select('id').eq('slug', uniqueSlug).maybeSingle();
    if (!data) break;
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  return uniqueSlug;
}

export async function approveInstitution(requestId: string) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };
    
    // Check if the user is explicitly set as the super admin email, OR if they have the super_admin database role
    let isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      isSuperAdmin = profile?.role === 'super_admin';
    }
    
    if (!isSuperAdmin) {
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
    const baseSlug = generateSlug(req.institute_name);
    const slug = await generateUniqueSlug(supabaseAdmin, baseSlug);
    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';
    const primary_domain = `${slug}.${ROOT_DOMAIN}`;

    // Determine plan using a mapping or default
    // We'll skip plan mapping right now and do it manually if needed, or query plan by name later.

    const { data: newInst, error: instErr } = await supabaseAdmin
      .from('institutions')
      .insert({
        name: req.institute_name,
        slug: slug,
        logo: req.logo_url, // Pipe the pending logo into production
        primary_domain: primary_domain,
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

    if (userErr) {
        // Rollback Institution Creation
        await supabaseAdmin.from('institutions').delete().eq('id', newInst.id);
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

    // 2.5 Provision Subscription automatically based on the requested plan
    let planId = null;
    if (req.plan_selected) {
       const { data: requestedPlan } = await supabaseAdmin.from('pricing_plans').select('id').ilike('name', `%${req.plan_selected}%`).is('is_deleted', false).maybeSingle();
       if (requestedPlan) planId = requestedPlan.id;
    }
    if (!planId) {
       const { data: freePlan } = await supabaseAdmin.from('pricing_plans').select('id').ilike('name', '%free%').is('is_deleted', false).maybeSingle();
       if (freePlan) planId = freePlan.id;
    }
    if (!planId) {
       const { data: fallbackPlan } = await supabaseAdmin.from('pricing_plans').select('id').is('is_deleted', false).limit(1).maybeSingle();
       if (fallbackPlan) planId = fallbackPlan.id;
    }

    if (planId) {
       await supabaseAdmin.from('subscriptions').insert({
          institution_id: newInst.id,
          plan_id: planId,
          status: 'trial',
          total_paid: 0,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
       });
    }

    // 3. Update request status
    const { error: statusUpdateError } = await supabaseAdmin
      .from('institution_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (statusUpdateError) {
      // Rollback Auth User and Institution
      if (newUser?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      }
      await supabaseAdmin.from('institutions').delete().eq('id', newInst.id);
      return { error: `Failed to finalize request status: ${statusUpdateError.message}. Entire operation rolled back.` };
    }

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
    if (!user) return { error: 'Unauthorized.' };
    let isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      isSuperAdmin = profile?.role === 'super_admin';
    }
    
    if (!isSuperAdmin) {
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

export async function deleteInstitution(institutionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized.' };
    let isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      isSuperAdmin = profile?.role === 'super_admin';
    }
    
    if (!isSuperAdmin) {
      return { error: 'Unauthorized.' };
    }
    
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Cleanup: First delete all users bound to this institution to prevent foreign key errors and ghost auth accounts
    const { data: tenantUsers } = await supabaseAdmin.from('profiles').select('id').eq('institution_id', institutionId);
    
    if (tenantUsers && tenantUsers.length > 0) {
       for (const u of tenantUsers) {
          await supabaseAdmin.auth.admin.deleteUser(u.id);
       }
    }
    
    const { error } = await supabaseAdmin
      .from('institutions')
      .delete()
      .eq('id', institutionId);
      
    if (error) return { error: error.message };
    
    revalidatePath('/admin/institutions');
    return { success: true };
  } catch (e: any) {
      return { error: e.message };
  }
}
