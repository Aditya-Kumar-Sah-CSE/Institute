import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Edge case if profile isn't created yet
    return <div>Loading profile...</div>;
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
    </div>
  );
}
