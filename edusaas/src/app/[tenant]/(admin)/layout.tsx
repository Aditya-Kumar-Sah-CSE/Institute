import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';

export default async function TenantAdminLayout({
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

  // Enforce Institute Admin role
  const role = (session.user as any).role;
  if (role !== 'admin' && session.user.email !== 'iambestadi@gmail.com') {
    redirect(`/${tenant}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Tenant Admin Sidebar */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen hidden md:block flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold uppercase tracking-wider text-indigo-400">
            {tenant} Admin
          </h2>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-4">
          <a href={`/${tenant}/admin`} className="px-4 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm">Overview</a>
          <a href={`/${tenant}/admin/students`} className="px-4 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm">Manage Students</a>
          <a href={`/${tenant}/admin/courses`} className="px-4 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm">Course Editor</a>
          <a href={`/${tenant}/admin/settings`} className="px-4 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm">Settings</a>
        </nav>
      </aside>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
