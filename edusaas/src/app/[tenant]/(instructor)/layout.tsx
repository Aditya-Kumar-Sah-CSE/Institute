import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';

export default async function InstructorLayout({
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

  const role = (session.user as any).role;
  if (role !== 'instructor' && role !== 'admin') {
    redirect(`/${tenant}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b shadow-sm h-16 flex items-center px-8 justify-between bg-indigo-50">
        <h2 className="font-bold text-indigo-900">Instructor Portal</h2>
        <div className="text-sm font-medium text-indigo-700">Tenant: {tenant}</div>
      </header>
      <main className="max-w-7xl mx-auto py-8">
        {children}
      </main>
    </div>
  );
}
