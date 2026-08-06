import SharedDashboardLayout from '@/features/dashboard/layouts/SharedDashboardLayout';
import { getRequestContext } from '@/lib/context/requestContext';

export const dynamic = 'force-dynamic';

export default async function TenantDashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getRequestContext();
  return <SharedDashboardLayout context={context}>{children}</SharedDashboardLayout>;
}
