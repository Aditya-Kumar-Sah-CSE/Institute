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

    // 1. Get sheet info + type
    const { data: sheet, error: sheetError } = await supabase
      .from('coding_sheets')
      .select('id, title, created_by, sheet_type')
      .eq('id', sheetId)
      .single();

    if (sheetError || !sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    let totalProblems = 0;
    let solvedCount = 0;
    let rank = 1;

    if ((sheet as any).sheet_type === 'SQL') {
      const { count: sqlTotal } = await supabase
        .from('coding_sheet_sql_questions')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheetId);
      totalProblems = sqlTotal || 0;

      if (totalProblems === 0) {
        return NextResponse.json({ error: 'SQL sheet has no questions' }, { status: 400 });
      }

      const { count: userSqlSolved } = await supabase
        .from('coding_sheet_sql_progress')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheetId)
        .eq('user_id', user.id)
        .eq('is_solved', true);
      solvedCount = userSqlSolved || 0;

      if (solvedCount < totalProblems) {
        return NextResponse.json(
          { error: `Sheet not completed. Solved ${solvedCount}/${totalProblems} SQL questions.` },
          { status: 400 }
        );
      }

      const { data: allSqlProgress } = await supabase
        .from('coding_sheet_sql_progress')
        .select('user_id, question_number')
        .eq('sheet_id', sheetId)
        .eq('is_solved', true);

      if (allSqlProgress) {
        const solverCounts: Record<string, Set<number>> = {};
        allSqlProgress.forEach((row) => {
          if (!solverCounts[row.user_id]) solverCounts[row.user_id] = new Set();
          solverCounts[row.user_id].add(row.question_number);
        });
        const completers = Object.entries(solverCounts)
          .filter(([, set]) => set.size >= totalProblems)
          .map(([uid]) => uid);
        rank = Math.max(1, completers.indexOf(user.id) + 1);
      }
    } else if ((sheet as any).sheet_type === 'ROADMAP') {
      const { count: rmTotal } = await supabase
        .from('coding_sheet_roadmap_problems')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheetId);
      totalProblems = rmTotal || 0;

      if (totalProblems === 0) {
        return NextResponse.json({ error: 'Roadmap sheet has no unlocked problems yet' }, { status: 400 });
      }

      const { count: userRmSolved } = await supabase
        .from('coding_sheet_roadmap_progress')
        .select('id', { count: 'exact', head: true })
        .eq('sheet_id', sheetId)
        .eq('user_id', user.id)
        .eq('is_solved', true);
      solvedCount = userRmSolved || 0;

      if (solvedCount < totalProblems) {
        return NextResponse.json(
          { error: `Sheet not completed. Solved ${solvedCount}/${totalProblems} unlocked roadmap problems.` },
          { status: 400 }
        );
      }

      const { data: allRmProgress } = await supabase
        .from('coding_sheet_roadmap_progress')
        .select('user_id, problem_code')
        .eq('sheet_id', sheetId)
        .eq('is_solved', true);

      if (allRmProgress) {
        const solverCounts: Record<string, Set<string>> = {};
        allRmProgress.forEach((row) => {
          if (!solverCounts[row.user_id]) solverCounts[row.user_id] = new Set();
          solverCounts[row.user_id].add(row.problem_code);
        });
        const completers = Object.entries(solverCounts)
          .filter(([, set]) => set.size >= totalProblems)
          .map(([uid]) => uid);
        rank = Math.max(1, completers.indexOf(user.id) + 1);
      }
    } else {
      // 2. Get DSA sheet problems
      const { data: sheetProblems } = await supabase
        .from('coding_sheet_problems')
        .select('problem_id')
        .eq('sheet_id', sheetId);

      const problemIds = sheetProblems?.map(p => p.problem_id) || [];
      totalProblems = problemIds.length;

      if (totalProblems === 0) {
        return NextResponse.json({ error: 'Sheet has no problems' }, { status: 400 });
      }

      // 3. Count how many the user solved
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
      const { data: allSubs } = await supabase
        .from('coding_submissions')
        .select('student_id, problem_id, status')
        .in('problem_id', problemIds)
        .eq('status', 'ACCEPTED');

      if (allSubs) {
        const studentSolved: Record<string, Set<string>> = {};
        allSubs.forEach(s => {
          if (!studentSolved[s.student_id]) studentSolved[s.student_id] = new Set();
          studentSolved[s.student_id].add(s.problem_id);
        });

        const completers = Object.entries(studentSolved)
          .filter(([, solved]) => solved.size >= totalProblems)
          .map(([sid]) => sid);

        rank = Math.max(1, completers.indexOf(user.id) + 1);
      }
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
