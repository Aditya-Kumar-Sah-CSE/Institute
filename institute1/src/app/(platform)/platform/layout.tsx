import React from 'react';
import { getPlatformUser } from '@/lib/platform-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  CreditCard, 
  Globe, 
  Settings, 
  HelpCircle, 
  BarChart3, 
  ShieldAlert, 
  LayoutDashboard,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import './platform-console.css';

export default async function PlatformControlPlaneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const platformUser = await getPlatformUser();

  if (!platformUser) {
    redirect('/login?error=Unauthorized+Platform+Access');
  }

  return (
    <div className="cp-shell">
      {/* Control Plane Sidebar */}
      <aside className="cp-sidebar">
        <div className="cp-brand">
          <div className="cp-badge font-extrabold text-neon-cyan">SaaS CONTROL PLANE</div>
          <span className="cp-title">Smart Learn System</span>
        </div>

        <nav className="cp-nav">
          <div className="cp-section-label">Management</div>
          <Link href="/platform/dashboard" className="cp-nav-item">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link href="/platform/institutions" className="cp-nav-item">
            <Building2 size={18} />
            <span>Institutions</span>
          </Link>
          <Link href="/platform/billing" className="cp-nav-item">
            <CreditCard size={18} />
            <span>Billing & Plans</span>
          </Link>
          <Link href="/platform/domains" className="cp-nav-item">
            <Globe size={18} />
            <span>Domains</span>
          </Link>

          <div className="cp-section-label">System</div>
          <Link href="/platform/analytics" className="cp-nav-item">
            <BarChart3 size={18} />
            <span>Analytics</span>
          </Link>
          <Link href="/platform/audit-logs" className="cp-nav-item">
            <ShieldAlert size={18} />
            <span>Audit Logs</span>
          </Link>
          <Link href="/platform/settings" className="cp-nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <Link href="/platform/support" className="cp-nav-item">
            <HelpCircle size={18} />
            <span>Support</span>
          </Link>
        </nav>

        <div className="cp-user-panel">
          <div className="cp-user-info">
            <ShieldCheck size={16} className="text-neon-gold" />
            <div className="cp-user-details">
              <span className="cp-user-email">{platformUser.email}</span>
              <span className="cp-user-role">{platformUser.platformRole}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Control Plane Main Content Area */}
      <main className="cp-main">
        <header className="cp-header">
          <div className="cp-header-title">
            <span className="text-secondary text-sm">Control Plane Console</span>
          </div>
          <div className="cp-header-actions">
            <Link href="/smart-learning/admin" className="btn btn-secondary btn-sm">
              Launch Smart Learning Demo Tenant →
            </Link>
          </div>
        </header>
        <div className="cp-content">{children}</div>
      </main>
    </div>
  );
}
