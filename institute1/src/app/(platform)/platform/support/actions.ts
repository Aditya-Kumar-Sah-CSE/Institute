'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PlatformService } from '@/services/platform/platformService';
import { revalidatePath } from 'next/cache';

export async function impersonateTenant(formData: FormData) {
  try {
    const tenantId = formData.get('tenantId') as string;
    const reason = formData.get('reason') as string;

    if (!tenantId || !reason) {
      throw new Error('Tenant and reason are required');
    }

    // Resolve details for the selected tenant
    const institutions = await PlatformService.listInstitutions();
    const target = institutions.find(i => i.id === tenantId);
    if (!target) {
      throw new Error('Tenant not found');
    }

    // Log & Audited Session start
    const session = await PlatformService.startImpersonationSession(tenantId, reason);

    const cookieStore = await cookies();
    
    // Set cookies for tenant context middleware
    cookieStore.set('impersonated_tenant_id', tenantId, { path: '/' });
    cookieStore.set('impersonated_tenant_slug', target.slug, { path: '/' });
    cookieStore.set('impersonated_tenant_name', target.name, { path: '/' });
    cookieStore.set('impersonation_session_id', session.id, { path: '/' });

    revalidatePath('/platform/support');
    redirect(`/${target.slug}/dashboard`);
  } catch (error: any) {
    // Next.js redirect calls throw an internal error that must be rethrown to process redirection
    if (error && typeof error === 'object' && error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Impersonation failed:', error);
  }
}

export async function stopImpersonating() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('impersonation_session_id')?.value;

    if (sessionId) {
      await PlatformService.endImpersonationSession(sessionId);
    }
  } catch (err) {
    console.error('Failed to log impersonation session end:', err);
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete('impersonated_tenant_id');
    cookieStore.delete('impersonated_tenant_slug');
    cookieStore.delete('impersonated_tenant_name');
    cookieStore.delete('impersonation_session_id');

    revalidatePath('/platform/support');
    redirect('/platform/support');
  }
}
