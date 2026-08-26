import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: sheetProbs } = await supabase.from('coding_sheet_problems').select('*').limit(1);
  const { data: probs } = await supabase.from('coding_problems').select('*').limit(1);

  return NextResponse.json({
    coding_sheet_problems_keys: sheetProbs ? Object.keys(sheetProbs[0]) : [],
    coding_problems_keys: probs ? Object.keys(probs[0]) : [],
  });
}
