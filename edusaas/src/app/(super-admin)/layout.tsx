import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';

const SUPER_ADMIN_EMAIL = 'iambestadi@gmail.com';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Basic Auth Guard enforcing Super Admin only
  if (!session || !session.user || session.user.email !== SUPER_ADMIN_EMAIL) {
    if (session?.user) {
      // User is logged in but not a super admin, redirect to their tenant dashboard
      const tenant = (session.user as any).tenantSlug || 'default';
      redirect(`/${tenant}/dashboard`);
    } else {
      // Not logged in at all, redirect to a master login (or 404)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600">You must be the Super Admin to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex p-0 m-0">
      <aside className="w-64 bg-gray-900 text-white min-h-screen flex-shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black text-indigo-400 tracking-tight">EduSaaS</h2>
          <p className="text-xs text-gray-400 font-mono mt-1">SUPER ADMIN</p>
        </div>
        <nav className="mt-6">
          <a href="/admin" className="block px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            Dashboard
          </a>
          <a href="/admin/institutes" className="block px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            Institutes (Tenants)
          </a>
          <a href="/admin/billing" className="block px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            Billing & Revenue
          </a>
          <a href="/admin/settings" className="block px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            Platform Settings
          </a>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center h-16 sticky top-0">
          <div className="font-semibold text-gray-700">Global Overview</div>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <span>{session.user.email}</span>
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex justify-center items-center text-indigo-700">
              {session.user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
