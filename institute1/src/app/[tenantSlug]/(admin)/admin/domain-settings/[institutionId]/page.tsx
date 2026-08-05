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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '');

  return <DomainDetailClient _institution={institution} rootDomain={siteUrl} />;
}
