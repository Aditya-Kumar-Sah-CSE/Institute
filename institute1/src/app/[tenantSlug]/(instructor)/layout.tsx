import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '../(dashboard)/DashboardLayout.css';
import { signOut } from '@/features/auth/actions/auth';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';

export const dynamic = 'force-dynamic';

export default async function InstructorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tenant = await resolveTenantCache(tenantSlug, 'development');
  const isPlatform = tenantSlug === '__platform__' || (tenant as any)?.is_platform;

  if (!user) {
    if (isPlatform) {
      redirect('/login');
    } else {
      const tenant = await resolveTenantCache(tenantSlug, 'development');
      const baseUrl = generateTenantBaseUrl(tenant?.slug || null, 'development');
      redirect(`${baseUrl}/login`);
    }
  }

  const { getOrCreateProfile } = await import('@/lib/profile');
  const profile = await getOrCreateProfile(user);

  if (!profile) {
    // Edge case if profile isn't created yet (e.g. deleted from DB manually but not from Auth)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
        <div>
          <h3>Profile Not Found!</h3>
          <p>Your user profile seems to be missing from the database.</p>
          <p>If you deleted your test user from the 'profiles' table, you MUST also delete it from 'Authentication -&gt; Users' in Supabase!</p>
        </div>
        <form action={signOut}>
          <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Force Sign Out
          </button>
        </form>
      </div>
    );
  }

  if (profile.role !== 'instructor' && profile.role !== 'admin') {
    if (isPlatform) {
      redirect('/dashboard');
    } else {
      const tenant = await resolveTenantCache(tenantSlug, 'development');
      const baseUrl = generateTenantBaseUrl(tenant?.slug || null, 'development');
      redirect(`${baseUrl}/dashboard`);
    }
  }

  // Redirect pending or rejected instructors to dashboard
  if (profile.role === 'instructor' && (profile.status === 'pending' || profile.status === 'rejected')) {
    if (isPlatform) {
      redirect('/apply-instructor');
    } else {
      const tenant = await resolveTenantCache(tenantSlug, 'development');
      const baseUrl = generateTenantBaseUrl(tenant?.slug || null, 'development');
      redirect(`${baseUrl}/apply-instructor`);
    }
  }

  const tenant = await resolveTenantCache(tenantSlug, 'development');

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_name, logo_url')
    .single();

  return (
    <div className="dashboard-layout">
      <Sidebar 
        profile={profile} 
        roleView="instructor" 
        isSuperAdmin={profile.email === SUPER_ADMIN_EMAIL} 
        companyName={tenant?.name || settings?.company_name}
        companyLogo={tenant?.logo || settings?.logo_url}
      />
      <div className="dashboard-main">
        <Navbar 
          companyName={tenant?.name || settings?.company_name} 
          companyLogo={tenant?.logo || settings?.logo_url} 
          profile={profile}
          currentView="instructor"
        />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
