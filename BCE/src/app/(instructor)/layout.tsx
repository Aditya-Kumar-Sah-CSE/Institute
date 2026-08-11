import { redirect } from 'next/navigation';
import { getAuthorizedProfile, INSTRUCTOR_ROLES } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '../(dashboard)/DashboardLayout.css';
import { signOut } from '@/features/auth/actions/auth';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await getAuthorizedProfile({
    allowedRoles: INSTRUCTOR_ROLES,
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

  if (profile.role === 'instructor' && (profile.status === 'pending' || profile.status === 'rejected')) {
    redirect('/apply-instructor');
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_name, logo_url')
    .single();

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} roleView="instructor" isSuperAdmin={profile.email === SUPER_ADMIN_EMAIL} />
      <div className="dashboard-main">
        <Navbar 
          companyName={settings?.company_name} 
          companyLogo={settings?.logo_url} 
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
