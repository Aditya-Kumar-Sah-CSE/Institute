import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/tenantContext';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId } = await getTenantContext();

  try {
    const { platform, contestId, userConfirmed = false, endTime } = await request.json();

    if (!platform || !contestId) {
      return NextResponse.json({ error: 'Missing platform or contestId' }, { status: 400 });
    }

    const formattedEndTime = endTime ? new Date(Number(endTime)).toISOString() : null;

    // Resolve tenant ID
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      effectiveTenantId = profile?.institution_id || null;
    }

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }

    // 1. Fetch user's linked handle for platform from student_external_accounts (tenant isolated)
    let extAccount = null;
    try {
      const { data } = await supabase
        .from('student_external_accounts')
        .select('username')
        .eq('student_id', user.id)
        .eq('platform', platform)
        .maybeSingle();
      extAccount = data;
    } catch (e) {
      console.warn('Fetch external account error:', e);
    }

    let isVerified = false;

    // 2. Automated verification if Codeforces API available
    if (platform === 'CODEFORCES' && extAccount?.username) {
      const rawCfId = contestId.replace(/^cf-/, '');
      try {
        const cfRes = await fetch(
          `https://codeforces.com/api/contest.status?contestId=${rawCfId}&handle=${encodeURIComponent(extAccount.username)}&from=1&count=1`,
          { cache: 'no-store' }
        );
        if (cfRes.ok) {
          const json = await cfRes.json();
          if (json.status === 'OK') {
            isVerified = true;
          }
        }
      } catch (e) {
        console.warn('CF registration check error:', e);
      }
    }

    // 3. User confirmation fallback if automated API is inconclusive or platform lacks direct pre-contest handle endpoint
    if (!isVerified && userConfirmed) {
      isVerified = true;
    }

    if (!isVerified) {
      try {
        await supabase
          .from('contest_registrations')
          .upsert({
            institution_id: effectiveTenantId,
            user_id: user.id,
            platform,
            contest_id: contestId,
            registered: false,
            status: 'failed',
            end_time: formattedEndTime,
            updated_at: new Date().toISOString()
          }, { onConflict: 'institution_id,user_id,platform,contest_id' });
      } catch (e) {
        console.warn('Failed to store failed registration status:', e);
      }

      return NextResponse.json({
        success: false,
        status: 'failed',
        error: `Registration could not be automatically verified for ${platform}. Please complete registration on the official platform.`
      });
    }

    // 4. Update database record with verified status and end_time
    const verifiedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('contest_registrations')
      .upsert({
        institution_id: effectiveTenantId,
        user_id: user.id,
        platform,
        contest_id: contestId,
        registered: true,
        status: 'verified',
        end_time: formattedEndTime,
        verified_at: verifiedAt,
        updated_at: verifiedAt
      }, { onConflict: 'institution_id,user_id,platform,contest_id' })
      .select()
      .single();

    if (error) {
      console.warn('Failed to update contest_registrations DB record:', error);
    }

    return NextResponse.json({
      success: true,
      registered: true,
      status: 'verified',
      verifiedAt,
      registration: data || {
        institution_id: effectiveTenantId,
        user_id: user.id,
        platform,
        contest_id: contestId,
        registered: true,
        status: 'verified',
        end_time: formattedEndTime,
        verified_at: verifiedAt
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Verification failed' }, { status: 500 });
  }
}
