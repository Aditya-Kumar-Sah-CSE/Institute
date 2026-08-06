import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import '@/app/[tenantSlug]/(dashboard)/DashboardLayout.css';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { signOut } from '@/features/auth/actions/auth';
import { updateStreak } from '@/features/gamification/actions/gamification';
import { 
  DynamicBadgeCelebrator as BadgeCelebrator, 
  DynamicMonthlyCelebrator as MonthlyCelebrator 
} from '@/components/DynamicWrappers';
import { RequestContext } from '@/lib/context/requestContext';

export default async function SharedDashboardLayout({
  children,
  context,
}: {
  children: React.ReactNode;
  context: RequestContext;
}) {
  const supabase = await createClient();
  const user = await getUser();
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
  const profilePromise = getOrCreateProfile(user);
  const settingsPromise = supabase.from('company_settings').select('company_name, logo_url').single();

  const [profile, { data: settings }] = await Promise.all([profilePromise, settingsPromise]);

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
        <div>
          <h3>Profile Not Found!</h3>
          <p>Your user profile seems to be missing from the database.</p>
        </div>
        <form action={signOut}>
          <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px' }}>Force Sign Out</button>
        </form>
      </div>
    );
  }

  const isSuperAdmin = profile.email === SUPER_ADMIN_EMAIL || profile.role === 'super_admin';

  let tenant = null;
  if (!isPlatform && context.tenantSlug) {
    tenant = await resolveTenantCache(context.tenantSlug, 'development');
  }

  // Strict Muti-Tenant Isolation
  if (!isSuperAdmin && tenant) {
    if (profile.institution_id !== tenant.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Unauthorized Multi-Tenant Access</h3>
            <p>Your account is not registered with <strong>{tenant?.name || 'this institution'}</strong>.</p>
          </div>
          <form action={signOut}>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px' }}>Sign Out</button>
          </form>
        </div>
      );
    }
  }
  
  if (isPlatform && !isSuperAdmin) {
     return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Global Access Restricted</h3>
            <p>You do not have administrative clearance for the Global Platform.</p>
          </div>
          <form action={signOut}>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px' }}>Sign Out</button>
          </form>
        </div>
      );
  }

  const now = new Date();
  const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;
  const isSameDay = lastActive && 
                    lastActive.getDate() === now.getDate() && 
                    lastActive.getMonth() === now.getMonth() && 
                    lastActive.getFullYear() === now.getFullYear();

  if (!isSameDay) {
    updateStreak(user.id).catch(console.error);
  }

  return (
    <div className="dashboard-layout">
      <Sidebar 
        profile={profile} 
        roleView="student" 
        isSuperAdmin={isSuperAdmin} 
        companyName={tenant?.name || settings?.company_name}
        companyLogo={tenant?.logo || settings?.logo_url}
      />
      <div className="dashboard-main">
        <Navbar 
          companyName={tenant?.name || settings?.company_name} 
          companyLogo={tenant?.logo || settings?.logo_url} 
          profile={profile}
          currentView="student"
        />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
      <BadgeCelebrator />
      <MonthlyCelebrator />
    </div>
  );
}
