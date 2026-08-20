import { requireSuperAdmin, assertNotSuperAdminTarget, canAssignRole, SUPER_ADMIN_EMAIL } from '@/lib/super-admin';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/audit-logger';
import { successResponse, errorResponse, withSafeApiHandler } from '@/lib/api-response';

export const GET = withSafeApiHandler(async () => {
  await requireSuperAdmin();

  const adminSupabase = await createAdminClient();
  const { data: users, error } = await adminSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse(error.message, 'DATABASE_ERROR', 500);
  }

  const sanitizedUsers = (users || []).map((u: any) => ({
    ...u,
    isPlatformOwner: u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase(),
  }));

  return successResponse({ users: sanitizedUsers });
});

export const PATCH = withSafeApiHandler(async (request: Request) => {
  const admin = await requireSuperAdmin();

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 'BAD_REQUEST', 400);
  }

  const { userId, targetEmail, role, status } = body;

  if (!userId) {
    return errorResponse('Missing required parameter: userId', 'VALIDATION_ERROR', 400);
  }

  // Immutability Guard: Reject modifying Super Admin iambestadi@gmail.com
  if (targetEmail) {
    assertNotSuperAdminTarget(targetEmail, 'update role or status');
  }

  const adminSupabase = await createAdminClient();
  const { data: targetUser } = await adminSupabase.from('profiles').select('email, role').eq('id', userId).single();

  if (targetUser && targetUser.email) {
    assertNotSuperAdminTarget(targetUser.email, 'update role or status');
  }

  // Role Escalation Guard
  if (role && !canAssignRole({ email: admin.email }, role)) {
    return errorResponse('Cannot assign SUPER_ADMIN role.', 'ROLE_ESCALATION_FORBIDDEN', 403);
  }

  const updates: any = {};
  if (role) updates.role = role;
  if (status) updates.status = status;

  const { data: updated, error: updateErr } = await adminSupabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (updateErr) {
    return errorResponse(updateErr.message, 'DATABASE_ERROR', 500);
  }

  await logAuditAction({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'UPDATE_USER_ROLE_STATUS',
    target: targetUser?.email || userId,
    oldValue: { role: targetUser?.role },
    newValue: updates,
  });

  return successResponse({ user: updated }, 'User updated successfully');
});

export const DELETE = withSafeApiHandler(async (request: Request) => {
  const admin = await requireSuperAdmin();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const targetEmail = searchParams.get('email');

  if (targetEmail) {
    assertNotSuperAdminTarget(targetEmail, 'delete');
  }

  if (!userId) {
    return errorResponse('Missing required parameter: userId', 'VALIDATION_ERROR', 400);
  }

  const adminSupabase = await createAdminClient();
  const { data: targetUser } = await adminSupabase.from('profiles').select('email').eq('id', userId).single();

  if (targetUser && targetUser.email) {
    assertNotSuperAdminTarget(targetUser.email, 'delete');
  }

  const { error: delErr } = await adminSupabase.from('profiles').delete().eq('id', userId);
  if (delErr) {
    return errorResponse(delErr.message, 'DATABASE_ERROR', 500);
  }

  await logAuditAction({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'DELETE_USER',
    target: targetUser?.email || userId,
    oldValue: targetUser,
    newValue: null,
  });

  return successResponse(null, 'User deleted successfully');
});
