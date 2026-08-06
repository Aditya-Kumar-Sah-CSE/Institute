import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '@/app/[tenantSlug]/(dashboard)/DashboardLayout.css';
import { signOut } from '@/features/auth/actions/auth';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import { RequestContext } from '@/lib/context/requestContext';

export default async function SharedAdminLayout({
  children,
  context,
}: {
  children: React.ReactNode;
  context: RequestContext;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isPlatform = context.isControlPlane || context.isPlatform;
  
  if (!user) {
    if (isPlatform) {
      redirect('/login');
    } else {
      const tenant = await resolveTenantCache(context.tenantSlug!, 'development');
      const baseUrl = generateTenantBaseUrl(tenant?.slug || null, 'development');
      redirect(`${baseUrl}/login`);
    }
  }

  const { getOrCreateProfile } = await import('@/lib/profile');
  const profile = await getOrCreateProfile(user);

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
        <div>
          <h3>Profile Not Found!</h3>
          <p>Your user profile seems to be missing from the database.</p>
        </div>
        <form action={signOut}>
          <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px' }}>
            Force Sign Out
          </button>
        </form>
      </div>
    );
  }

  const isDbSuperAdmin = profile.role === 'super_admin';
  const isSuperAdminEmail = user.email === SUPER_ADMIN_EMAIL;
  const isSuperAdmin = isDbSuperAdmin || isSuperAdminEmail;

  if (profile.role !== 'admin' && !isSuperAdmin) {
    if (isPlatform) {
      redirect('/dashboard');
    } else {
      const tenant = await resolveTenantCache(context.tenantSlug!, 'development');
      const baseUrl = generateTenantBaseUrl(tenant?.slug || null, 'development');
      redirect(`${baseUrl}/dashboard`);
    }
  }

  let tenant = null;
  if (!isPlatform && context.tenantSlug) {
    tenant = await resolveTenantCache(context.tenantSlug, 'development');
  }

  if (!isSuperAdmin && tenant) {
    if (profile.institution_id !== tenant.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Unauthorized Admin Environment</h3>
            <p>Your admin account is configured for a different institution ecosystem.</p>
          </div>
          <form action={signOut}>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px' }}>
              Sign Out Securely
            </button>
          </form>
        </div>
      );
    }
  }

  let companyName = null;
  let companyLogo = null;
  if (isSuperAdmin) {
    const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();
    companyName = settings?.company_name;
    companyLogo = settings?.logo_url;
  } else {
    // Post-migration: institution_id must be non-null for every user.
    if (!profile.institution_id) {
      throw new Error(`Data integrity error: admin user ${user.id} has no institution_id. Run migration 092.`);
    }
    const adminSb = await createAdminClient();
    const { data: inst } = await adminSb.from('institutions').select('name, logo').eq('id', profile.institution_id).single();
    companyName = inst?.name;
    companyLogo = inst?.logo;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} isAdmin={true} isSuperAdmin={isSuperAdmin} companyName={companyName} companyLogo={companyLogo} />
      <div className="dashboard-main">
        <Navbar companyName={companyName} companyLogo={companyLogo} profile={profile} currentView="admin" />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
