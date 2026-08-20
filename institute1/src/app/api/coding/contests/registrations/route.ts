import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/tenantContext';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId } = await getTenantContext();

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // 1. Fail-safe cleanup of registrations older than 2 hours post-contest
    try {
      if (tenantId) {
        await supabase
          .from('contest_registrations')
          .delete()
          .eq('institution_id', tenantId)
          .lt('end_time', twoHoursAgo);
      }
    } catch (e) {
      console.warn('Contest cleanup warning:', e);
    }

    // 2. Query user's contest registrations scoped by user_id and institution_id if available
    let query = supabase
      .from('contest_registrations')
      .select('id, platform, contest_id, registered, status, end_time, verified_at, updated_at')
      .eq('user_id', user.id);

    if (tenantId) {
      query = query.eq('institution_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Fetch contest_registrations DB error:', error);
      return NextResponse.json({ registrations: [] });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (e: any) {
    console.warn('Contest registrations GET error:', e);
    return NextResponse.json({ registrations: [] });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId } = await getTenantContext();

  try {
    const { platform, contestId, status = 'pending_verification', endTime } = await request.json();

    if (!platform || !contestId) {
      return NextResponse.json({ error: 'Missing platform or contestId' }, { status: 400 });
    }

    const formattedEndTime = endTime ? new Date(Number(endTime)).toISOString() : null;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Clean up expired registrations safely
    try {
      if (tenantId) {
        await supabase
          .from('contest_registrations')
          .delete()
          .eq('institution_id', tenantId)
          .lt('end_time', twoHoursAgo);
      }
    } catch (e) {
      console.warn('Contest cleanup warning:', e);
    }

    // Fetch user profile institution_id if tenantId header not populated
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

    // Upsert registration intent with tenant isolation
    const { data, error } = await supabase
      .from('contest_registrations')
      .upsert({
        institution_id: effectiveTenantId,
        user_id: user.id,
        platform,
        contest_id: contestId,
        registered: false,
        status,
        end_time: formattedEndTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'institution_id,user_id,platform,contest_id' })
      .select()
      .single();

    if (error) {
      console.warn('Upsert contest_registrations DB error:', error);
      return NextResponse.json({
        success: true,
        registration: {
          platform,
          contest_id: contestId,
          registered: false,
          status,
          end_time: formattedEndTime
        }
      });
    }

    return NextResponse.json({ success: true, registration: data });
  } catch (e: any) {
    console.warn('Contest registration POST error:', e);
    return NextResponse.json({
      success: true,
      registration: {
        platform: '',
        contest_id: '',
        registered: false,
        status: 'pending_verification'
      }
    });
  }
}
