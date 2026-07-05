import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import BadgeCelebrator from '@/components/shared/BadgeCelebrator';
import './DashboardLayout.css';
import MonthlyCelebrator from '@/components/shared/MonthlyCelebrator';
import { auth } from '@/lib/auth/auth.config';
import { getTenantDb } from '@/lib/db/tenant';
import { profiles } from '@/lib/db/schema/tenant-schema';
import { eq } from 'drizzle-orm';
import { signOut } from 'next-auth/react';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  const db = await getTenantDb();
  
  // 1. Fetch Profile
  const profileRes = await db.select().from(profiles).where(eq(profiles.id, session.user.id));
  const profile = profileRes[0];

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', textAlign: 'center', color: 'black' }}>
        <div>
          <h3>Profile Not Found!</h3>
          <p>Your user profile seems to be missing from the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* We pass a mock settings/companyName for now since we mapped tenant to backend */}
      <Sidebar profile={profile} roleView="student" isSuperAdmin={profile.role === 'admin'} />
      <div className="dashboard-main">
        <Navbar 
          companyName={tenant.toUpperCase()} 
          companyLogo={null} 
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
