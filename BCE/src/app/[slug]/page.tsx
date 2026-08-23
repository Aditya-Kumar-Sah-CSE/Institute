import { notFound } from 'next/navigation';
import { getTenantBySlug, getTenantLandingContent } from '@/lib/tenant';
import InstitutionLanding from '@/components/tenant/InstitutionLanding';

interface DynamicTenantPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DynamicTenantPage({ params }: DynamicTenantPageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const tenant = await getTenantBySlug(slug);
  if (!tenant || !tenant.isActive) {
    notFound();
  }

  const landing = await getTenantLandingContent(tenant);
  return <InstitutionLanding tenant={tenant} landing={landing} />;
}
