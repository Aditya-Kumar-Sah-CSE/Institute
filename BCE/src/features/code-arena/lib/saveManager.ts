export interface BackupPayload {
  userId: string;
  workspaceId: string; // 'cloud', 'local', or battleId / problemId
  targetId: string; // filePath or problemId
  language?: string;
  content: string;
  timestamp: number;
  version?: number;
}

export function buildBackupKey(
  userId: string,
  workspaceId: string,
  targetId: string,
  language?: string
): string {
  const cleanUser = userId || 'guest';
  const cleanWS = workspaceId || 'default';
  const cleanTarget = targetId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const cleanLang = language ? `:${language}` : '';
  return `bce:code-backup:${cleanUser}:${cleanWS}:${cleanTarget}${cleanLang}`;
}

export function saveLocalStorageBackup(key: string, payload: BackupPayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[SaveManager] Failed to write localStorage backup:', err);
  }
}

export function getLocalStorageBackup(key: string): BackupPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as BackupPayload;
  } catch (err) {
    console.warn('[SaveManager] Failed to read localStorage backup:', err);
    return null;
  }
}

export function clearLocalStorageBackup(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[SaveManager] Failed to clear localStorage backup:', err);
  }
}

/**
 * Deterministic Backup Recovery Guard:
 * Restores a local backup ONLY when it matches the same user, workspace, target, language,
 * and has a timestamp newer than the confirmed storage/server timestamp.
 */
export function restoreBackupIfNewer(
  userId: string,
  workspaceId: string,
  targetId: string,
  language: string | undefined,
  confirmedSavedTimestamp: number,
  backupKey: string
): string | null {
  const backup = getLocalStorageBackup(backupKey);
  if (!backup) return null;

  const currentUid = userId || 'guest';
  const currentWS = workspaceId || 'default';

  if (
    backup.userId === currentUid &&
    backup.workspaceId === currentWS &&
    backup.targetId === targetId &&
    (language === undefined || backup.language === language) &&
    backup.timestamp > confirmedSavedTimestamp &&
    typeof backup.content === 'string'
  ) {
    return backup.content;
  }

  // Stale or non-matching backup, clear safely
  clearLocalStorageBackup(backupKey);
  return null;
}

/**
 * Version / Sequence Counter to prevent out-of-order async save responses
 * from overwriting newer state.
 */
export class VersionTracker {
  private currentVersion = 0;

  public next(): number {
    this.currentVersion += 1;
    return this.currentVersion;
  }

  public isLatest(version: number): boolean {
    return version === this.currentVersion;
  }

  public getVersion(): number {
    return this.currentVersion;
  }

  public reset(): void {
    this.currentVersion = 0;
  }
}
