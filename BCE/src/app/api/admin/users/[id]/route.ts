import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { assertNotSuperAdminTarget, canAssignRole, SUPER_ADMIN_EMAIL } from '@/lib/super-admin';
import { isAdminRole } from '@/lib/role-utils';
import { logAuditAction } from '@/lib/audit-logger';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role, status } = body;

    const adminSupabase = await createAdminClient();
    const { data: targetUser } = await adminSupabase
      .from('profiles')
      .select('email, role')
      .eq('id', targetUserId)
      .single();

    // IMMUTABILITY GUARD: Admin CANNOT modify Super Admin account
    if (targetUser?.email && targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the Platform Owner can modify this account.' },
        { status: 403 }
      );
    }

    // ROLE ESCALATION GUARD: Admin CANNOT assign SUPER_ADMIN role
    if (role && !canAssignRole({ email: user.email, role: profile?.role }, role)) {
      return NextResponse.json(
        { error: 'Admin cannot assign SUPER_ADMIN role.' },
        { status: 403 }
      );
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const { data: updated, error: updateErr } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logAuditAction({
      actorId: user.id,
      actorEmail: user.email || 'admin',
      action: 'ADMIN_UPDATE_USER',
      target: targetUser?.email || targetUserId,
      oldValue: { role: targetUser?.role },
      newValue: updates,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || 'Server error' }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();
    const { data: targetUser } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('id', targetUserId)
      .single();

    // IMMUTABILITY GUARD: Admin CANNOT delete Super Admin account
    if (targetUser?.email && targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the Platform Owner can modify this account.' },
        { status: 403 }
      );
    }

    const { error: delErr } = await adminSupabase.from('profiles').delete().eq('id', targetUserId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    await logAuditAction({
      actorId: user.id,
      actorEmail: user.email || 'admin',
      action: 'ADMIN_DELETE_USER',
      target: targetUser?.email || targetUserId,
      oldValue: targetUser,
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || 'Server error' }, { status });
  }
}
