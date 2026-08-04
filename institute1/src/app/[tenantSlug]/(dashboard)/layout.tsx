import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import './DashboardLayout.css';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { signOut } from '@/features/auth/actions/auth';
import { updateStreak } from '@/features/gamification/actions/gamification';
import { 
  DynamicBadgeCelebrator as BadgeCelebrator, 
  DynamicMonthlyCelebrator as MonthlyCelebrator 
} from '@/components/DynamicWrappers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    const { tenant, routingMode } = await getTenantConfig();
    const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);
    redirect(`${baseUrl}/login`);
  }

  const { getOrCreateProfile } = await import('@/lib/profile');
  const profilePromise = getOrCreateProfile(user);
  const settingsPromise = supabase.from('company_settings').select('company_name, logo_url').single();

  const [profile, { data: settings }] = await Promise.all([profilePromise, settingsPromise]);

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

  const { tenant } = await getTenantConfig();

  // Strict Muti-Tenant Isolation
  if (profile.email !== SUPER_ADMIN_EMAIL && tenant) {
    if (profile.institution_id !== tenant.id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'white' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Unauthorized Multi-Tenant Access</h3>
            <p style={{ color: '#9ca3af' }}>Your account ({profile.email}) is not registered with <strong>{tenant.name}</strong>.</p>
            <p style={{ color: '#9ca3af' }}>Secure tenant isolation is active.</p>
          </div>
          <form action={signOut}>
            <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sign Out to Switch Institutions
            </button>
          </form>
        </div>
      );
    }
  }

  // Optimize: Only update streak and check badges if it's a new day
  const now = new Date();
  const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;
  const isSameDay = lastActive && 
                    lastActive.getDate() === now.getDate() && 
                    lastActive.getMonth() === now.getMonth() && 
                    lastActive.getFullYear() === now.getFullYear();

  if (!isSameDay) {
    // Fire and forget so we don't block the layout render
    updateStreak(user.id).catch(console.error);
  }

  // Settings are fetched concurrently with profile above

  return (
    <div className="dashboard-layout">
      <Sidebar 
        profile={profile} 
        roleView="student" 
        isSuperAdmin={profile.email === SUPER_ADMIN_EMAIL} 
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
