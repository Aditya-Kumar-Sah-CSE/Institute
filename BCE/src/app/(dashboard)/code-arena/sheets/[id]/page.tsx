import { notFound } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import SheetDetailClient from '@/features/code-arena/components/SheetDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return null;

  // 1. Fetch sheet details
  const { data: sheet, error: sheetError } = await supabase
    .from('coding_sheets')
    .select('id, title, description, created_by, created_at')
    .eq('id', id)
    .maybeSingle();

  if (sheetError || !sheet) {
    notFound();
  }

  // 2. Fetch linked problems with metadata
  const { data: problemsData, error: problemsError } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
    .eq('sheet_id', id)
    .order('order_index', { ascending: true });

  if (problemsError) {
    notFound();
  }

  const problems = (problemsData || []).map((p: any) => ({
    ...p.coding_problems,
    order_index: p.order_index,
  }));

  // 3. Fetch user solved status
  const { data: submissions } = await supabase
    .from('coding_submissions')
    .select('problem_id')
    .eq('student_id', user.id)
    .eq('status', 'ACCEPTED');

  const solvedProblemIds = Array.from(new Set((submissions || []).map(s => s.problem_id)));

  return (
    <SheetDetailClient 
      sheet={{ ...sheet, problems }}
      solvedProblemIds={solvedProblemIds}
    />
  );
}
