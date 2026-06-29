import type { LevelName } from '@/types';

export function getLevelFromXP(xp: number): LevelName {
  if (xp >= 100000) return 'Mythic';
  if (xp >= 25000) return 'Legend';
  if (xp >= 10000) return 'Grandmaster';
  if (xp >= 5000) return 'Master';
  if (xp >= 2500) return 'Expert';
  if (xp >= 1000) return 'Advanced';
  if (xp >= 500) return 'Intermediate';
  if (xp >= 100) return 'Novice';
  return 'Beginner';
}

export function getXPForNextLevel(xp: number): { current: number; next: number; label: LevelName } {
  if (xp >= 100000) return { current: 100000, next: 9999999, label: 'Mythic' };
  if (xp >= 25000) return { current: 25000, next: 100000, label: 'Legend' };
  if (xp >= 10000) return { current: 10000, next: 25000, label: 'Grandmaster' };
  if (xp >= 5000) return { current: 5000, next: 10000, label: 'Master' };
  if (xp >= 2500) return { current: 2500, next: 5000, label: 'Expert' };
  if (xp >= 1000) return { current: 1000, next: 2500, label: 'Advanced' };
  if (xp >= 500) return { current: 500, next: 1000, label: 'Intermediate' };
  if (xp >= 100) return { current: 100, next: 500, label: 'Novice' };
  return { current: 0, next: 100, label: 'Beginner' };
}

export function getXPProgress(xp: number): number {
  const { current, next } = getXPForNextLevel(xp);
  if (next >= 9999999) return 100;
  return Math.min(((xp - current) / (next - current)) * 100, 100);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return date.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function getLevelColor(level: LevelName): string {
  switch (level) {
    case 'Beginner': return 'var(--neon-lime)';
    case 'Novice': return '#3b82f6'; // blue
    case 'Intermediate': return 'var(--neon-cyan)';
    case 'Advanced': return 'var(--neon-purple)';
    case 'Expert': return '#f97316'; // orange
    case 'Master': return 'var(--neon-red)';
    case 'Grandmaster': return '#ec4899'; // pink
    case 'Legend': return 'var(--neon-gold)';
    case 'Mythic': return '#fff'; // white
    default: return 'var(--neon-cyan)';
  }
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'sem 1':
    case 'sem 2': return 'var(--neon-lime)';
    case 'sem 3':
    case 'sem 4': return 'var(--neon-orange)';
    case 'sem 5':
    case 'sem 6': return 'var(--neon-red)';
    case 'sem 7':
    case 'sem 8': return 'var(--neon-purple)';
    default: return 'var(--neon-cyan)';
  }
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
  );
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}

export function isValidGitHubUrl(url: string): boolean {
  return /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(url);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
