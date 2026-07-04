import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdmissionFormClient from './AdmissionFormClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admission Registration Form',
  description: 'Apply for admission manually.'
};

export default async function AdmissionPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();

  return (
    <AdmissionFormClient 
      companyName={settings?.company_name} 
      logoUrl={settings?.logo_url} 
    />
  );
}
