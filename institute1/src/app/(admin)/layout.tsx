import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '../(dashboard)/DashboardLayout.css';
import { signOut } from '@/features/auth/actions/auth';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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

  const isDbSuperAdmin = profile.role === 'super_admin';
  const isSuperAdminEmail = user.email === SUPER_ADMIN_EMAIL;
  const isSuperAdmin = isDbSuperAdmin || isSuperAdminEmail;

  if (profile.role !== 'admin' && !isSuperAdmin) {
    redirect('/dashboard');
  }

  let companyName = null;
  let companyLogo = null;

  if (isSuperAdmin) {
    const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();
    companyName = settings?.company_name;
    companyLogo = settings?.logo_url;
  } else if (profile.institution_id) {
    const adminSb = await createAdminClient();
    const { data: inst } = await adminSb.from('institutions').select('name, logo').eq('id', profile.institution_id).single();
    companyName = inst?.name;
    companyLogo = inst?.logo;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} isAdmin={true} isSuperAdmin={isSuperAdmin} />
      <div className="dashboard-main">
        <Navbar 
          companyName={companyName} 
          companyLogo={companyLogo} 
          profile={profile}
          currentView="admin"
        />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
