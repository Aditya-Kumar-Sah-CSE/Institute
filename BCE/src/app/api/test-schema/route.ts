import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/super-admin';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await requireSuperAdmin();
    const supabase = await createAdminClient();
    const { data: sheetProbs } = await supabase.from('coding_sheet_problems').select('*').limit(1);
    const { data: probs } = await supabase.from('coding_problems').select('*').limit(1);

    return NextResponse.json({
      coding_sheet_problems_keys: sheetProbs?.[0] ? Object.keys(sheetProbs[0]) : [],
      coding_problems_keys: probs?.[0] ? Object.keys(probs[0]) : [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Forbidden' }, { status: err?.status || 403 });
  }
}
