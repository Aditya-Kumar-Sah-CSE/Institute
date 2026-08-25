import { z } from 'zod';
import { withApiHandler } from '@/lib/api/api-utils';
import { parseBody } from '@/lib/api/validation';
import { NotFoundError, ValidationError } from '@/lib/api/errors';

// ─── Validation Schemas ───

const createGoalSchema = z.object({
  goal_text: z.string().min(1, 'Goal text is required').max(500, 'Goal text too long'),
  duration_mins: z.number().int().min(5, 'Minimum 5 minutes').max(1440, 'Maximum 1440 minutes').default(30),
  routine: z.boolean().default(false),
  reminder_time: z.string().nullable().optional(),
});

const updateGoalSchema = z.object({
  goal_id: z.string().uuid('Invalid goal ID'),
  goal_text: z.string().min(1).max(500).optional(),
  duration_mins: z.number().int().min(5).max(1440).optional(),
  routine: z.boolean().optional(),
  reminder_time: z.string().nullable().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
});

// ─── GET /api/goals ───

export const GET = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all) {
      const { data, error } = await ctx.supabase
        .from('student_goals')
        .select('*')
        .eq('user_id', ctx.user!.id)
        .order('created_at', { ascending: false });

      if (error) return ctx.error(error.message, 'DATABASE_ERROR', 400);
      return ctx.success({ goals: data || [] });
    }

    const { data, error } = await ctx.supabase
      .from('student_goals')
      .select('*')
      .eq('user_id', ctx.user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return ctx.error(error.message, 'DATABASE_ERROR', 400);
    return ctx.success({ goal: data || null });
  }
);

// ─── POST /api/goals ───

export const POST = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (request, ctx) => {
    const body = await parseBody(request, createGoalSchema);

    // Get user's institution (optional)
    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', ctx.user!.id)
      .single();

    // Archive existing active goals
    await ctx.supabase
      .from('student_goals')
      .update({ status: 'archived' })
      .eq('user_id', ctx.user!.id)
      .eq('status', 'active');

    // Insert new goal
    const { data, error } = await ctx.supabase
      .from('student_goals')
      .insert({
        user_id: ctx.user!.id,
        institution_id: profile?.institution_id || null,
        goal_text: body.goal_text,
        duration_mins: body.duration_mins,
        routine: body.routine,
        reminder_time: body.reminder_time || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) return ctx.error(error.message, 'DATABASE_ERROR', 400);
    return ctx.success({ goal: data }, undefined, 201);
  }
);

// ─── PATCH /api/goals ───

export const PATCH = withApiHandler(
  { auth: 'required', rateLimit: 'standard' },
  async (request, ctx) => {
    const body = await parseBody(request, updateGoalSchema);

    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.goal_text !== undefined) updateFields.goal_text = body.goal_text;
    if (body.duration_mins !== undefined) updateFields.duration_mins = body.duration_mins;
    if (body.routine !== undefined) updateFields.routine = body.routine;
    if (body.reminder_time !== undefined) updateFields.reminder_time = body.reminder_time || null;
    if (body.status !== undefined) updateFields.status = body.status;

    const { data, error } = await ctx.supabase
      .from('student_goals')
      .update(updateFields)
      .eq('id', body.goal_id)
      .eq('user_id', ctx.user!.id)  // Tenant isolation: only own goals
      .select()
      .single();

    if (error) return ctx.error(error.message, 'DATABASE_ERROR', 400);
    if (!data) throw new NotFoundError('Goal');
    return ctx.success({ goal: data });
  }
);

// ─── DELETE /api/goals ───

export const DELETE = withApiHandler(
  { auth: 'required', rateLimit: 'sensitive' },
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goal_id');

    if (!goalId) {
      throw new ValidationError('goal_id query parameter is required');
    }

    const { error } = await ctx.supabase
      .from('student_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', ctx.user!.id);  // Tenant isolation: only own goals

    if (error) return ctx.error(error.message, 'DATABASE_ERROR', 400);
    return ctx.success({ deleted: true });
  }
);
