import React from 'react';
import { notFound } from 'next/navigation';
import { getInstitutionById } from '@/features/admin/actions/domainActions';
import DomainDetailClient from './DomainDetailClient';

export const metadata = {
  title: 'Manage Institution Domains | Admin',
};

export default async function DomainDetailServerPage({
  params,
}: {
  params: Promise<{ institutionId: string }>;
}) {
  const resolvedParams = await params;
  const institution = await getInstitutionById(resolvedParams.institutionId);
  
  if (!institution) {
    notFound();
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'smartlearn.in';

  return <DomainDetailClient _institution={institution} rootDomain={rootDomain} />;
}
