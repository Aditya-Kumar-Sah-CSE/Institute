import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Gamification Utils Ported from Institute1
export function getXPProgress(xp: number): number {
  const nextLevelXP = getXPForNextLevel(Math.floor(Math.sqrt(xp / 100)) + 1);
  const currentLevelXP = Math.floor(Math.sqrt(xp / 100)) ** 2 * 100;
  return Math.min(100, Math.max(0, ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));
}

export function getXPForNextLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

export function getLevelColor(levelName: string): string {
  switch (levelName.toLowerCase()) {
    case 'novice': return 'text-slate-400';
    case 'apprentice': return 'text-green-400';
    case 'scholar': return 'text-blue-400';
    case 'master': return 'text-purple-400';
    case 'grandmaster': return 'text-amber-400';
    default: return 'text-gray-400';
  }
}
