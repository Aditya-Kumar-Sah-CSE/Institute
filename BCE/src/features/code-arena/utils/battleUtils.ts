/**
 * Utility function to dynamically resolve battle status based on real-time timestamps
 */
export function resolveBattleStatus(battle: any): 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' {
  if (!battle) return 'UPCOMING';
  if (battle.status === 'CANCELLED') return 'CANCELLED';
  if (battle.status === 'COMPLETED') return 'COMPLETED';

  const now = Date.now();
  const startTime = battle.start_time ? new Date(battle.start_time).getTime() : null;
  const durationMs = (battle.duration_minutes || 30) * 60 * 1000;
  const endTime = battle.end_time 
    ? new Date(battle.end_time).getTime() 
    : (startTime ? startTime + durationMs : null);

  if (startTime) {
    if (now < startTime) {
      return 'UPCOMING';
    }
    if (endTime && now > endTime) {
      return 'COMPLETED';
    }
    if (now >= startTime && (!endTime || now <= endTime)) {
      return 'LIVE';
    }
  }

  // Fallback to database status attribute
  if (battle.status === 'LIVE') return 'LIVE';
  if (battle.status === 'COMPLETED') return 'COMPLETED';
  return 'UPCOMING';
}
