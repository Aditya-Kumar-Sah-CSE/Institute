'use server';

import { createClient } from '@/lib/supabase/server';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function startImpersonation(institutionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return { error: 'Unauthorized: Only Super Admin can impersonate an institution.' };
    }

    const { data: inst } = await supabase
      .from('institutions')
      .select('id, name, slug')
      .eq('id', institutionId)
      .single();

    if (!inst) {
      return { error: 'Institution not found.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('impersonated_tenant_id', inst.id, { path: '/', httpOnly: true, sameSite: 'lax' });
    cookieStore.set('impersonated_tenant_name', inst.name, { path: '/', httpOnly: true, sameSite: 'lax' });
    cookieStore.set('impersonated_tenant_slug', inst.slug, { path: '/', httpOnly: true, sameSite: 'lax' });

    revalidatePath('/', 'layout');
    return { success: true, slug: inst.slug };
  } catch (e: any) {
    return { error: e.message || 'Failed to start impersonation' };
  }
}

export async function stopImpersonation() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('impersonated_tenant_id');
    cookieStore.delete('impersonated_tenant_name');
    cookieStore.delete('impersonated_tenant_slug');

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e: any) {
    return { error: e.message || 'Failed to stop impersonation' };
  }
}
