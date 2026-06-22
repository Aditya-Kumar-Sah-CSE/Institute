import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import '../(dashboard)/DashboardLayout.css';

export default async function InstructorLayout({
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

  if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    redirect('/dashboard');
  }

  // Redirect pending or rejected instructors to dashboard
  if (profile.role === 'instructor' && profile.status !== 'active') {
    redirect('/apply-instructor');
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .single();

  return (
    <div className="dashboard-layout">
      <Sidebar profile={profile} roleView="instructor" />
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
