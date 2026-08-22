const DB_NAME = 'BCEProblemDrafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

export interface DraftRecord {
  id: string; // The fully qualified key: user:{userId}:problem:{problemId}:language:{language}
  userId: string;
  problemId: string;
  language: string;
  code: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getDraftKey(userId: string, problemId: string, language: string): string {
  return `user:${userId}:problem:${problemId}:language:${language}`;
}

export async function saveDraft(
  userId: string,
  problemId: string,
  language: string,
  code: string
): Promise<void> {
  try {
    const db = await openDB();
    const id = getDraftKey(userId, problemId, language);
    const record: DraftRecord = {
      id,
      userId,
      problemId,
      language,
      code,
      updatedAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB saveDraft error:', e);
  }
}

export async function getDraft(
  userId: string,
  problemId: string,
  language: string
): Promise<DraftRecord | null> {
  try {
    const db = await openDB();
    const id = getDraftKey(userId, problemId, language);

    return await new Promise<DraftRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB getDraft error:', e);
    return null;
  }
}

export async function removeDraft(
  userId: string,
  problemId: string,
  language: string
): Promise<void> {
  try {
    const db = await openDB();
    const id = getDraftKey(userId, problemId, language);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB removeDraft error:', e);
  }
}

export async function clearObsoleteDrafts(olderThanDays: number = 30): Promise<void> {
  try {
    const db = await openDB();
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const record = cursor.value as DraftRecord;
          if (record.updatedAt < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('IndexedDB clearObsoleteDrafts error:', e);
  }
}
