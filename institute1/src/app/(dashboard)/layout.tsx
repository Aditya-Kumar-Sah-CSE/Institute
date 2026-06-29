import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import BadgeCelebrator from '@/components/shared/BadgeCelebrator';
import { updateStreak } from '@/features/gamification/actions/gamification';
import './DashboardLayout.css';

export default async function DashboardLayout({
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
        <form action="/api/auth/signout" method="POST">
          <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent-red, #ff4444)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Force Sign Out
          </button>
        </form>
      </div>
    );
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

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .single();

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} />
      <div className="dashboard-main">
        <Navbar 
          companyName={settings?.company_name} 
          companyLogo={settings?.logo_url} 
          profile={profile}
          currentView="student"
        />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
      <BadgeCelebrator />
    </div>
  );
}
