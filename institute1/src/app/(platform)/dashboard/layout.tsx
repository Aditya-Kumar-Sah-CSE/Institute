import SharedDashboardLayout from '@/features/dashboard/layouts/SharedDashboardLayout';
import { getRequestContext } from '@/lib/context/requestContext';

export default async function PlatformDashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getRequestContext();
  return <SharedDashboardLayout context={context}>{children}</SharedDashboardLayout>;
}
