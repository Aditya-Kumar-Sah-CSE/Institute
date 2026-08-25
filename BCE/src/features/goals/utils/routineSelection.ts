/**
 * Shared routine-selection logic.
 *
 * Each routine slot has a `time_slot` ("HH:MM") that marks when it STARTS.
 * A slot's window runs from its start time to the next slot's start time.
 * The **last** slot of the day wraps around midnight to the first slot's
 * start time the following day.
 *
 * Example with slots 04:00, 10:00, 22:00:
 *   - 22:00 → 04:00 (next day)  — crosses midnight
 *   - 04:00 → 10:00
 *   - 10:00 → 22:00
 *
 * All comparisons use numeric minutes-since-midnight to avoid lexicographic
 * string comparison bugs.
 */

export interface RoutineSlot {
  id?: string;
  time_slot: string;   // "HH:MM" or "HH:MM:SS"
  task_name: string;
  sort_order?: number;
  [key: string]: any;
}

export interface CompletionRecord {
  task_id: string;
  status: string;
  [key: string]: any;
}

/** Convert "HH:MM" or "HH:MM:SS" into total minutes since midnight. */
export function timeSlotToMinutes(timeSlot: string): number {
  const parts = timeSlot.split(':').map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

/**
 * Sort routine slots by their numeric time_slot value.
 * Returns a new array — never mutates the original.
 */
export function sortRoutinesByTime(routines: RoutineSlot[]): RoutineSlot[] {
  return [...routines].sort(
    (a, b) => timeSlotToMinutes(a.time_slot) - timeSlotToMinutes(b.time_slot)
  );
}

/**
 * Determine which routine slot is currently active based on the real clock.
 *
 * Strategy:
 *   1. Sort all slots by their start time (minutes since midnight).
 *   2. Find the latest slot whose start time is ≤ nowMins.
 *      – This naturally handles the "last slot wraps past midnight" case
 *        because if nowMins is e.g. 02:00 (120 mins) and no slot starts
 *        ≤ 120 except maybe the 04:00 slot, we fall back to the last slot
 *        of the previous "day" (the one with the highest start time).
 *   3. Specifically: the last slot's window ends at the first slot's start
 *        time the next day. So if nowMins < firstSlot.start, the active
 *        slot is the last slot (midnight-crossing window).
 *
 * Returns the active RoutineSlot, or null if routines is empty.
 */
export function getActiveRoutine(
  routines: RoutineSlot[],
  now?: Date
): RoutineSlot | null {
  if (!routines.length) return null;

  const currentTime = now ?? new Date();
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  const sorted = sortRoutinesByTime(routines);

  // Walk backwards through sorted slots to find the latest one that has started
  let active: RoutineSlot | null = null;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const slotMins = timeSlotToMinutes(sorted[i].time_slot);
    if (nowMins >= slotMins) {
      active = sorted[i];
      break;
    }
  }

  // If no slot has started yet today (nowMins < all slots' start times),
  // we are in the midnight-crossing window of the LAST slot from yesterday.
  if (!active) {
    active = sorted[sorted.length - 1];
  }

  return active;
}

/**
 * Get the index of the currently active routine in the provided (sorted) array.
 * Returns -1 if routines is empty.
 */
export function getActiveRoutineIndex(
  routines: RoutineSlot[],
  now?: Date
): number {
  if (!routines.length) return -1;
  const active = getActiveRoutine(routines, now);
  if (!active) return -1;

  // Match by id first, then by time_slot+task_name
  const idx = routines.findIndex(
    r =>
      (r.id && r.id === active.id) ||
      (r.time_slot === active.time_slot && r.task_name === active.task_name)
  );
  return idx === -1 ? 0 : idx;
}

/**
 * Determine whether a given slot is "overdue" — i.e. the current time has
 * passed the slot's start time.
 *
 * For midnight-crossing detection: if the slot's start time is in the PM
 * range (e.g. 22:00) and nowMins is small (e.g. 02:00), we're still inside
 * that slot's window so it's NOT overdue — it's active.
 *
 * A slot is overdue when:
 *   - It's not the currently active slot, AND
 *   - nowMins > slotMins
 * OR simply: when it's the active slot and its time has passed.
 *
 * For the dashboard, "overdue" means "the slot's scheduled start time has
 * passed" which is just nowMins > slotStartMins, accounting for midnight.
 */
export function isRoutineOverdue(
  slot: RoutineSlot,
  routines: RoutineSlot[],
  now?: Date
): boolean {
  const currentTime = now ?? new Date();
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const slotMins = timeSlotToMinutes(slot.time_slot);

  const sorted = sortRoutinesByTime(routines);
  const firstSlotMins = timeSlotToMinutes(sorted[0].time_slot);
  const lastSlot = sorted[sorted.length - 1];
  const lastSlotMins = timeSlotToMinutes(lastSlot.time_slot);

  // If this is the last slot and it crosses midnight, being in the
  // after-midnight window means we're INSIDE this slot, not overdue.
  const isLastSlot =
    (slot.id && slot.id === lastSlot.id) ||
    (slot.time_slot === lastSlot.time_slot && slot.task_name === lastSlot.task_name);

  if (isLastSlot && nowMins < firstSlotMins) {
    // We are in the midnight-crossing window of this slot — it IS active,
    // technically its start time has passed (yesterday), so mark as overdue
    // only if the student hasn't started it. From a UX perspective this is
    // "active", not overdue.
    return false;
  }

  return nowMins > slotMins;
}

/**
 * Find the first routine slot from the sorted list that is NOT completed
 * or skipped AND is currently the time-active slot or has not yet started.
 *
 * Priority:
 *   1. The time-active slot if it's not done.
 *   2. The next upcoming slot (after active) that's not done.
 *   3. If all future slots are done, check earlier slots.
 *   4. null if everything is done.
 */
export function getDueRoutineTask(
  routines: RoutineSlot[],
  completions: CompletionRecord[],
  now?: Date
): RoutineSlot | null {
  if (!routines.length) return null;

  const sorted = sortRoutinesByTime(routines);
  const active = getActiveRoutine(routines, now);
  if (!active) return sorted[0];

  const isDone = (slot: RoutineSlot) => {
    const slotId = slot.id || slot.time_slot;
    const comp = completions.find(c => c.task_id === slotId);
    return comp?.status === 'completed' || comp?.status === 'skipped';
  };

  // If the active slot is not done, it's the due task
  if (!isDone(active)) return active;

  // Find the active slot's index in sorted array
  const activeIdx = sorted.findIndex(
    r =>
      (r.id && r.id === active.id) ||
      (r.time_slot === active.time_slot && r.task_name === active.task_name)
  );

  // Look forward from active slot
  for (let i = activeIdx + 1; i < sorted.length; i++) {
    if (!isDone(sorted[i])) return sorted[i];
  }

  // Wrap around: look from beginning up to active slot
  for (let i = 0; i < activeIdx; i++) {
    if (!isDone(sorted[i])) return sorted[i];
  }

  // All done
  return null;
}

/** Format "HH:MM" 24h time_slot to 12-hour display. */
export function formatTime12h(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${(m || 0).toString().padStart(2, '0')} ${ampm}`;
}

/** Format minutes to human-readable "Xh Ym" format. */
export function formatMinsToHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}
