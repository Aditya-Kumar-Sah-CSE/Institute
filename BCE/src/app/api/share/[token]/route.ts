import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    const { data: tokenData, error } = await supabase
      .from('public_share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !tokenData) {
      return NextResponse.json({ error: 'Share link is invalid' }, { status: 404 });
    }

    const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
    if (isExpired || tokenData.revoked_at) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      resourceType: tokenData.resource_type,
      resourceId: tokenData.resource_id,
      expiresAt: tokenData.expires_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Revoke the token by setting revoked_at to now
    const { data: tokenData } = await supabase
      .from('public_share_tokens')
      .select('created_by')
      .eq('token', token)
      .single();

    if (!tokenData) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (tokenData.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('public_share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Revoked successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
