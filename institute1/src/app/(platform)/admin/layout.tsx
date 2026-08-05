import SharedAdminLayout from '@/features/admin/layouts/SharedAdminLayout';
import { getRequestContext } from '@/lib/context/requestContext';

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getRequestContext();
  return <SharedAdminLayout context={context}>{children}</SharedAdminLayout>;
}
