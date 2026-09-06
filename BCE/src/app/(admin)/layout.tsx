import { getAuthorizedProfile, ADMIN_ROLES } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '../(dashboard)/DashboardLayout.css';
import { signOut } from '@/features/auth/actions/auth';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

import { 
  DynamicPwaRegister as PwaRegister, 
  DynamicPWAInstallPrompt as PWAInstallPrompt, 
  DynamicFeedbackWidget as FeedbackWidget 
} from '@/components/DynamicWrappers';
import { Analytics } from "@vercel/analytics/react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await getAuthorizedProfile({
    allowedRoles: ADMIN_ROLES,
    onUnauthenticated: '/login',
    onUnauthorized: '/dashboard',
  });

  if (!profile) {
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

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_name, logo_url')
    .single();

  return (
    <div className="dashboard-shell">
      <div className="navbar-wrapper">
        <Navbar 
          companyName={settings?.company_name} 
          companyLogo={settings?.logo_url} 
          profile={profile}
          currentView="admin"
        />
      </div>
      <div className="main-wrapper">
        <div className="content-wrapper">
          <main className="dashboard-content">
            {children}
          </main>
        </div>
        <div className="sidebar-wrapper">
          <Sidebar key="admin" profile={profile} isAdmin={true} isSuperAdmin={profile.email === SUPER_ADMIN_EMAIL} />
        </div>
      </div>
      <PwaRegister />
      <PWAInstallPrompt />
      <FeedbackWidget />
      <Analytics />
    </div>
  );
}
