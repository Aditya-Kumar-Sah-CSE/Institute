import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireSuperAdmin } from '@/lib/super-admin';
import { createAdminClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/audit-logger';
import {
  getTodayIstDateString,
  sanitizeClubPhotoUrl,
  sanitizePublicHref,
  type CoordinatorStatusMode,
} from '@/lib/club-utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUS_MODES: CoordinatorStatusMode[] = ['auto', 'active', 'past'];

const cleanText = (v: unknown, max = 200) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

function invalidateClubCache() {
  try {
    revalidateTag('coding-club', { expire: 0 });
  } catch {
    // Ignore outside Next cache context
  }
  revalidatePath('/');
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const db = await createAdminClient();

    const [{ data: mentors, error: mErr }, { data: coordinators, error: cErr }, { data: events, error: eErr }] =
      await Promise.all([
        db
          .from('club_faculty_mentors')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        db
          .from('club_coordinators')
          .select('*')
          .order('term_end_date', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        db
          .from('club_events')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

    if (mErr || cErr || eErr) {
      return NextResponse.json(
        { success: false, error: mErr?.message || cErr?.message || eErr?.message || 'Failed to load club records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        mentors: mentors || [],
        coordinators: coordinators || [],
        events: events || [],
        todayIst: getTodayIstDateString(),
      },
    });
  } catch (err: any) {
    const status = err?.message?.includes('Forbidden') ? 403 : 401;
    return NextResponse.json({ success: false, error: err?.message || 'Unauthorized' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const db = await createAdminClient();
    const body = await request.json();
    const entity = body?.entity;

    if (entity === 'mentor') {
      const id = UUID_RE.test(String(body.id || '')) ? String(body.id) : undefined;
      const name = cleanText(body.name, 140);
      if (!name) {
        return NextResponse.json({ success: false, error: 'Mentor name is required.' }, { status: 400 });
      }

      const payload: Record<string, any> = {
        name,
        club_role: cleanText(body.club_role, 100) || 'Club Mentor',
        post: cleanText(body.post, 240),
        timeline: cleanText(body.timeline, 100) || '2026 – Present',
        photo_url: sanitizeClubPhotoUrl(body.photo_url),
        profile_url: sanitizePublicHref(body.profile_url),
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      };
      if (id) payload.id = id;

      const { data: saved, error } = await db
        .from('club_faculty_mentors')
        .upsert(payload)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      await logAuditAction({
        actorId: admin.id,
        actorEmail: admin.email,
        action: id ? 'UPDATE_CLUB_MENTOR' : 'CREATE_CLUB_MENTOR',
        target: name,
        newValue: payload,
      });

      invalidateClubCache();
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === 'coordinator') {
      const id = UUID_RE.test(String(body.id || '')) ? String(body.id) : undefined;
      const name = cleanText(body.name, 140);
      if (!name) {
        return NextResponse.json({ success: false, error: 'Coordinator name is required.' }, { status: 400 });
      }

      const rawEnd = cleanText(body.term_end_date, 10);
      const termEndDate = /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ? rawEnd : '2028-12-31';
      const statusMode: CoordinatorStatusMode = VALID_STATUS_MODES.includes(body.status_mode)
        ? body.status_mode
        : 'auto';

      const payload: Record<string, any> = {
        name,
        profile_url: sanitizePublicHref(body.profile_url),
        batch_label: cleanText(body.batch_label, 60) || '28 Batch',
        term_label: cleanText(body.term_label, 60) || '2027 – 2028',
        term_end_date: termEndDate,
        status_mode: statusMode,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      };
      if (id) payload.id = id;

      const { data: saved, error } = await db
        .from('club_coordinators')
        .upsert(payload)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      await logAuditAction({
        actorId: admin.id,
        actorEmail: admin.email,
        action: id ? 'UPDATE_CLUB_COORDINATOR' : 'CREATE_CLUB_COORDINATOR',
        target: `${name} (${payload.batch_label})`,
        newValue: payload,
      });

      invalidateClubCache();
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === 'event') {
      const id = UUID_RE.test(String(body.id || '')) ? String(body.id) : undefined;
      const title = cleanText(body.title, 200);
      if (!title) {
        return NextResponse.json({ success: false, error: 'Event title is required.' }, { status: 400 });
      }

      const rawImages = Array.isArray(body.image_urls) ? body.image_urls : [];
      const imageUrls = rawImages
        .map((u: unknown) => sanitizeClubPhotoUrl(u))
        .filter((u: string | null): u is string => Boolean(u))
        .slice(0, 12);

      const rawWinners = Array.isArray(body.winners) ? body.winners : [];
      const winners = rawWinners
        .filter((w: any) => w && typeof w === 'object' && typeof w.name === 'string' && w.name.trim())
        .map((w: any) => ({
          medal: cleanText(w.medal, 16) || '🏅',
          name: cleanText(w.name, 120),
          detail: cleanText(w.detail, 140),
        }))
        .slice(0, 30);

      const payload: Record<string, any> = {
        title,
        badge_label: cleanText(body.badge_label, 80) || 'Club Event',
        event_date_label: cleanText(body.event_date_label, 120),
        venue: cleanText(body.venue, 160),
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : '',
        winners,
        image_urls: imageUrls,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      };
      if (id) payload.id = id;

      const { data: saved, error } = await db
        .from('club_events')
        .upsert(payload)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      await logAuditAction({
        actorId: admin.id,
        actorEmail: admin.email,
        action: id ? 'UPDATE_CLUB_EVENT' : 'CREATE_CLUB_EVENT',
        target: title,
        newValue: payload,
      });

      invalidateClubCache();
      return NextResponse.json({ success: true, data: saved });
    }

    return NextResponse.json({ success: false, error: 'Unknown entity type.' }, { status: 400 });
  } catch (err: any) {
    const status = err?.message?.includes('Forbidden') ? 403 : 401;
    return NextResponse.json({ success: false, error: err?.message || 'Unauthorized' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { entity, id } = await request.json();

    if (!UUID_RE.test(String(id || '')) || !['mentor', 'coordinator', 'event'].includes(entity)) {
      return NextResponse.json({ success: false, error: 'Invalid deletion target.' }, { status: 400 });
    }

    const db = await createAdminClient();
    const table =
      entity === 'mentor'
        ? 'club_faculty_mentors'
        : entity === 'event'
        ? 'club_events'
        : 'club_coordinators';
    const { error } = await db.from(table).delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    await logAuditAction({
      actorId: admin.id,
      actorEmail: admin.email,
      action:
        entity === 'mentor'
          ? 'DELETE_CLUB_MENTOR'
          : entity === 'event'
          ? 'DELETE_CLUB_EVENT'
          : 'DELETE_CLUB_COORDINATOR',
      target: String(id),
    });

    invalidateClubCache();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err?.message?.includes('Forbidden') ? 403 : 401;
    return NextResponse.json({ success: false, error: err?.message || 'Unauthorized' }, { status });
  }
}

