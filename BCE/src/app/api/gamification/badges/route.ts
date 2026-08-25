import { z } from 'zod';
import { withApiHandler } from '@/lib/api/api-utils';
import { parseBody } from '@/lib/api/validation';
import { getUnseenBadges, markBadgesSeen } from '@/features/gamification/actions/gamification';

export const GET = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (_request, ctx) => {
    const data = await getUnseenBadges();

    // Immediately mark them as seen so they don't pop up again on reload/navigation
    if (data && data.length > 0) {
      const ids = data.map((d: any) => d.id);
      await markBadgesSeen(ids);
    }

    return ctx.success({ badges: data || [] });
  }
);

const markSeenSchema = z.object({
  badgeIds: z.array(z.string()).min(1, 'At least one badge ID is required'),
});

export const POST = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (request, ctx) => {
    const body = await parseBody(request, markSeenSchema);
    await markBadgesSeen(body.badgeIds);
    return ctx.success({ marked: true });
  }
);
