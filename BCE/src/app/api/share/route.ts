import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resourceType, resourceId } = await request.json();

    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'Missing resourceType or resourceId' }, { status: 400 });
    }

    // Generate a secure 32-byte hex token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    const { error } = await supabase
      .from('public_share_tokens')
      .insert({
        token,
        resource_type: resourceType,
        resource_id: resourceId,
        created_by: user.id,
        expires_at: expiresAt,
      });

    if (error) {
      console.error('Failed to create share token:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      shareUrl: `/share/${token}`,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
