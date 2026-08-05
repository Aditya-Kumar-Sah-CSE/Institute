import SharedDashboard from '@/features/dashboard/pages/SharedDashboard';
import { getRequestContext } from '@/lib/context/requestContext';

export default async function PlatformDashboardPage(props: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const context = await getRequestContext();
  return <SharedDashboard context={context} searchParams={props.searchParams} />;
}
