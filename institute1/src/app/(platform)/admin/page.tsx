import SharedAdminDashboard from '@/features/admin/pages/SharedAdminDashboard';
import { getRequestContext } from '@/lib/context/requestContext';

export default async function PlatformAdminPage() {
  const context = await getRequestContext();
  return <SharedAdminDashboard context={context} />;
}
