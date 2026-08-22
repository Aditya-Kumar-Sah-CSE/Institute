import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sheetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*, profiles(name, role)')
      .eq('user_id', user.id)
      .eq('sheet_id', sheetId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: cert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sheetId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get sheet info + problems
    const { data: sheet, error: sheetError } = await supabase
      .from('coding_sheets')
      .select('id, title, created_by')
      .eq('id', sheetId)
      .single();

    if (sheetError || !sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // 2. Get sheet problems
    const { data: sheetProblems } = await supabase
      .from('coding_sheet_problems')
      .select('problem_id')
      .eq('sheet_id', sheetId);

    const problemIds = sheetProblems?.map(p => p.problem_id) || [];
    const totalProblems = problemIds.length;

    if (totalProblems === 0) {
      return NextResponse.json({ error: 'Sheet has no problems' }, { status: 400 });
    }

    // 3. Count how many the user solved
    let solvedCount = 0;
    if (problemIds.length > 0) {
      const { data: subs } = await supabase
        .from('coding_submissions')
        .select('problem_id, status')
        .eq('student_id', user.id)
        .in('problem_id', problemIds)
        .eq('status', 'ACCEPTED');

      if (subs) {
        const solvedSet = new Set(subs.map(s => s.problem_id));
        solvedCount = solvedSet.size;
      }
    }

    // 4. Verify completion — must have solved ALL problems
    if (solvedCount < totalProblems) {
      return NextResponse.json(
        { error: `Sheet not completed. Solved ${solvedCount}/${totalProblems} problems.` },
        { status: 400 }
      );
    }

    // 5. Calculate rank among all students who solved problems from this sheet
    // Get all students who have submissions for this sheet's problems
    const { data: allSubs } = await supabase
      .from('coding_submissions')
      .select('student_id, problem_id, status')
      .in('problem_id', problemIds)
      .eq('status', 'ACCEPTED');

    let rank = 1;
    if (allSubs) {
      // Count solved per student
      const studentSolved: Record<string, Set<string>> = {};
      allSubs.forEach(s => {
        if (!studentSolved[s.student_id]) studentSolved[s.student_id] = new Set();
        studentSolved[s.student_id].add(s.problem_id);
      });
      
      // Students who completed all problems
      const completers = Object.entries(studentSolved)
        .filter(([, solved]) => solved.size >= totalProblems)
        .map(([sid]) => sid);
      
      rank = Math.max(1, completers.indexOf(user.id) + 1);
    }

    // 6. Get company name
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .maybeSingle();
    const companyName = settings?.company_name || 'BCE Code Arena';

    // 7. Generate certificate code: CS-YYYY-MMDD-SOLVED-RANDOM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const certCode = `CS-${year}-${month}${day}-${solvedCount}-${rand}`;

    // 8. Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('sheet_id', sheetId)
      .maybeSingle();

    let certData;
    if (existingCert) {
      const { data: updatedCert, error: updateError } = await supabase
        .from('certificates')
        .update({
          xp_earned: solvedCount * 100,
          course_rank: rank,
          tasks_completed: solvedCount,
          total_tasks: totalProblems,
          accuracy: 100,
        })
        .eq('id', existingCert.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      certData = updatedCert;
    } else {
      const { data: newCert, error: insertError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          sheet_id: sheetId,
          xp_earned: solvedCount * 100,
          course_rank: rank,
          tasks_completed: solvedCount,
          total_tasks: totalProblems,
          accuracy: 100,
          duration_minutes: 0,
          company_name: companyName,
          certificate_code: certCode,
          signature_type: 'default',
          signature_name: 'Aditya Kumar Sah',
          signature_designation: 'The Developer & The Coder',
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      certData = newCert;
    }

    return NextResponse.json({ success: true, data: certData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
