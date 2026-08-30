import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized CRON access' }, { status: 401 });
  }

  try {
    console.log('Cron Job: Cleaning up unverified/pending users registered > 48 hours ago...');
    const adminSupabase = await createAdminClient();

    // 1. Try PL/pgSQL function RPC first
    const { data: rpcCount, error: rpcError } = await adminSupabase.rpc('cleanup_pending_unverified_users');

    if (!rpcError && typeof rpcCount === 'number') {
      return NextResponse.json({
        status: 'success',
        message: `Successfully cleaned up ${rpcCount} pending unverified users.`,
        deletedCount: rpcCount,
      });
    }

    if (rpcError) {
      console.warn('RPC cleanup_pending_unverified_users error, falling back to Auth Admin API:', rpcError.message);
    }

    // 2. Fallback using Supabase Auth Admin API
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    let page = 1;
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (listError || !users || users.length === 0) {
        hasMore = false;
        break;
      }

      for (const user of users) {
        const createdAt = new Date(user.created_at);
        const isOlderThan48h = createdAt < cutoffTime;
        const isUnverified = !user.email_confirmed_at;
        const hasNeverLoggedIn = !user.last_sign_in_at;

        if (isOlderThan48h && (isUnverified || hasNeverLoggedIn)) {
          const { error: delError } = await adminSupabase.auth.admin.deleteUser(user.id);
          if (!delError) {
            deletedCount++;
          } else {
            console.error(`Failed to delete unverified user ${user.id}:`, delError.message);
          }
        }
      }

      if (users.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Successfully cleaned up ${deletedCount} pending unverified users.`,
      deletedCount,
    });
  } catch (err: any) {
    console.error('Error executing cleanup-pending-users cron job:', err);
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Cleanup job failed',
    }, { status: 500 });
  }
}
