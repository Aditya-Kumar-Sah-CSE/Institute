import { z } from 'zod';
import { withApiHandler } from '@/lib/api/api-utils';
import { parseBody } from '@/lib/api/validation';
import crypto from 'crypto';

const createShareSchema = z.object({
  resourceType: z.string().min(1, 'resourceType is required').max(50),
  resourceId: z.string().min(1, 'resourceId is required').max(200),
});

export const POST = withApiHandler(
  { auth: 'required', rateLimit: 'sensitive' },
  async (request, ctx) => {
    const body = await parseBody(request, createShareSchema);

    // Generate a secure 32-byte hex token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    const { error } = await ctx.supabase
      .from('public_share_tokens')
      .insert({
        token,
        resource_type: body.resourceType,
        resource_id: body.resourceId,
        created_by: ctx.user!.id,
        expires_at: expiresAt,
      });

    if (error) {
      console.error('Failed to create share token:', error);
      return ctx.error('Database error creating share token', 'DATABASE_ERROR', 500);
    }

    return ctx.success({
      shareUrl: `/share/${token}`,
      expiresAt,
    }, undefined, 201);
  }
);
