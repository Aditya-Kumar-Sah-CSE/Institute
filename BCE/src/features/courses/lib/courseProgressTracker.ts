'use client';

export const LAST_COURSE_ACTIVITY_KEY = 'smartlearn_last_course_lesson';
export const COURSE_UPDATED_EVENT = 'smartlearn:course-updated';

export interface LastCourseActivity {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  weekNumber?: number | null;
  updatedAt: string;
}

export function recordLastCourseActivity(activity: Omit<LastCourseActivity, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  if (!activity.courseId || !activity.lessonId) return;
  try {
    const payload: LastCourseActivity = {
      ...activity,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAST_COURSE_ACTIVITY_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(COURSE_UPDATED_EVENT));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function readLastCourseActivity(): LastCourseActivity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_COURSE_ACTIVITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.courseId && parsed.lessonId) {
      return parsed as LastCourseActivity;
    }
  } catch {
    return null;
  }
  return null;
}

