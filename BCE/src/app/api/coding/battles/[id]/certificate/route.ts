import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: battleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*, profiles(name, role)')
      .eq('user_id', user.id)
      .eq('battle_id', battleId)
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
    const { id: battleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get battle info
    const { data: battle, error: battleError } = await supabase
      .from('coding_battles')
      .select('title, status, created_at')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // 2. Get participant stats
    const { data: participant, error: partError } = await supabase
      .from('coding_battle_participants')
      .select('score, rank, joined_at, finished_at')
      .eq('battle_id', battleId)
      .eq('student_id', user.id)
      .single();

    if (partError || !participant) {
      return NextResponse.json({ error: 'Participant stats not found' }, { status: 404 });
    }

    // 3. Count problems and submissions
    const { data: battleProblems } = await supabase
      .from('coding_battle_problems')
      .select('problem_id')
      .eq('battle_id', battleId);

    const totalProblems = battleProblems?.length || 0;
    const problemIds = battleProblems?.map(p => p.problem_id) || [];

    let solvedCount = 0;
    let accuracy = 100;

    if (problemIds.length > 0) {
      // Solved submissions in this battle
      const { data: subs } = await supabase
        .from('coding_submissions')
        .select('problem_id, status')
        .eq('battle_id', battleId)
        .eq('student_id', user.id);

      if (subs) {
        const solvedSet = new Set(subs.filter(s => s.status === 'ACCEPTED').map(s => s.problem_id));
        solvedCount = solvedSet.size;

        const totalSubmissions = subs.length;
        if (totalSubmissions > 0) {
          accuracy = Math.round((subs.filter(s => s.status === 'ACCEPTED').length / totalSubmissions) * 100);
        }
      }
    }

    // 4. Calculate duration
    let duration = 0;
    if (participant.joined_at && participant.finished_at) {
      duration = Math.round(
        (new Date(participant.finished_at).getTime() - new Date(participant.joined_at).getTime()) / 60000
      );
    }

    // 5. Get default company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .maybeSingle();
    const companyName = settings?.company_name || 'SL Code Arena';

    // 6. Generate Certificate Code: CB-YYYY-MMDD-SCORE-RANDOM
    const issueDateObj = new Date();
    const year = issueDateObj.getFullYear();
    const month = String(issueDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(issueDateObj.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const scoreVal = participant.score || 0;
    const certCode = `CB-${year}-${month}${day}-${scoreVal}-${rand}`;

    // 7. Check if certificate exists, else insert
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('battle_id', battleId)
      .maybeSingle();

    let certData;
    if (existingCert) {
      // Update stats in case they completed more problems or got a higher rank
      const { data: updatedCert, error: updateError } = await supabase
        .from('certificates')
        .update({
          xp_earned: scoreVal,
          course_rank: participant.rank || 1,
          tasks_completed: solvedCount,
          total_tasks: totalProblems,
          accuracy,
          duration_minutes: duration,
        })
        .eq('id', existingCert.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      certData = updatedCert;
    } else {
      // Create new certificate
      const { data: newCert, error: insertError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          battle_id: battleId,
          xp_earned: scoreVal,
          course_rank: participant.rank || 1,
          tasks_completed: solvedCount,
          total_tasks: totalProblems,
          accuracy,
          duration_minutes: duration,
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
