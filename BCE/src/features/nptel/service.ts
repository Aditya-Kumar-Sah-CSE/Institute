import { createAdminClient } from '@/lib/supabase/server';
import { ConfiguredNptelProvider } from './provider';
import type { NptelProvider, NptelProviderAssignment } from './types';

const validDate = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
export const assignmentStatus = (deadline: string, now = new Date()) => { const seconds = Math.floor((new Date(deadline).getTime() - now.getTime()) / 1000); return seconds < 0 ? 'OVERDUE' : seconds <= 86400 ? 'URGENT' : seconds <= 3 * 86400 ? 'DUE_SOON' : 'UPCOMING'; };

export class NPTELSyncService {
  constructor(private provider: NptelProvider = new ConfiguredNptelProvider()) {}
  async syncCourse(course: any) {
    const db = await createAdminClient();
    try {
      // A short retry protects against transient public-provider/network failures.
      let assignments: NptelProviderAssignment[] | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2 && !assignments; attempt++) {
        try { assignments = await this.provider.getCourseAssignments(course.external_id || course.id); }
        catch (error) { lastError = error; if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 300)); }
      }
      if (!assignments) throw lastError instanceof Error ? lastError : new Error('NPTEL provider unavailable');
      for (const item of assignments) await this.upsertAssignment(db, course.id, item);
      await db.from('nptel_courses').update({ last_synced_at: new Date().toISOString(), sync_status: 'success', sync_error: null }).eq('id', course.id);
      return { courseId: course.id, ok: true, count: assignments.length };
    } catch (error) { const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown provider error'; await db.from('nptel_courses').update({ sync_status: 'failed', sync_error: message, last_synced_at: new Date().toISOString() }).eq('id', course.id); return { courseId: course.id, ok: false, error: message }; }
  }
  private async upsertAssignment(db: any, courseId: string, item: NptelProviderAssignment) {
    const deadline = validDate(item.deadline); if (!item.id || !item.title?.trim() || !deadline) return;
    await db.from('nptel_assignments').upsert({ nptel_course_id: courseId, external_id: item.id, assignment_number: item.assignmentNumber || null, title: item.title.trim().slice(0, 250), description: item.description?.slice(0, 4000) || null, assignment_url: item.assignmentUrl || null, release_date: validDate(item.releaseDate), deadline, status: item.status || 'published', last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'nptel_course_id,external_id' });
  }
  async syncActiveCourses() { const db = await createAdminClient(); const { data } = await db.from('nptel_courses').select('*').in('id', (await db.from('student_nptel_courses').select('nptel_course_id').eq('active', true)).data?.map((x: any) => x.nptel_course_id) || []); return Promise.all((data || []).map(course => this.syncCourse(course))); }
}

export class NptelDeadlineAlertService {
  async generate(now = new Date()) {
    const db = await createAdminClient(); const { data: mappings } = await db.from('student_nptel_courses').select('student_id,nptel_course_id,nptel_courses(course_name,course_code,nptel_assignments(id,title,deadline))').eq('active', true);
    let created = 0;
    for (const mapping of mappings || []) for (const assignment of (mapping.nptel_courses as any)?.nptel_assignments || []) {
      const seconds = Math.floor((new Date(assignment.deadline).getTime() - now.getTime()) / 1000); const type = seconds < 0 ? 'MISSED' : seconds <= 3600 ? '1_HOUR' : seconds <= 21600 ? '6_HOURS' : seconds <= 86400 ? '24_HOURS' : seconds <= 3*86400 ? '3_DAYS' : seconds <= 7*86400 ? '7_DAYS' : null;
      if (!type) continue; const course = mapping.nptel_courses as any; const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assignment.deadline)); const message = type === 'MISSED' ? `${course.course_name} – ${assignment.title}: the assignment deadline has passed.` : `${course.course_code || course.course_name} – ${assignment.title} is due ${time}.`;
      const { error } = await db.from('notifications').insert({ user_id: mapping.student_id, type: 'nptel_assignment', title: type === 'MISSED' ? 'NPTEL Assignment Missed' : 'NPTEL Assignment Reminder', message, link: '/student/nptel', reference_type: 'nptel_assignment', reference_id: assignment.id, reminder_type: type }); if (!error) created++;
    } return created;
  }
}
