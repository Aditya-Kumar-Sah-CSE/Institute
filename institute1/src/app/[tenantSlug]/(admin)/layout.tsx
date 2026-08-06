import SharedAdminLayout from '@/features/admin/layouts/SharedAdminLayout';
import { getRequestContext } from '@/lib/context/requestContext';

export const dynamic = 'force-dynamic';

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getRequestContext();
  return <SharedAdminLayout context={context}>{children}</SharedAdminLayout>;
}
