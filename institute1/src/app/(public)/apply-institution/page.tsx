import { createClient } from '@/lib/supabase/server';
import ApplyInstitutionClient from './ApplyInstitutionClient';

export const metadata = {
  title: 'Apply for Institution | Smart Learn AI'
};

export default async function ApplyInstitutionPage() {
  const supabase = await createClient();
  
  // Fetch active pricing plans directly from the database
  const { data: plans } = await supabase
    .from('pricing_plans')
    .select('id, name, monthly_price')
    .eq('status', 'active')
    .eq('is_deleted', false)
    .order('monthly_price', { ascending: true });

  return <ApplyInstitutionClient plans={plans || []} />;
}
