import Dexie, { type Table } from 'dexie';
import type { ChatMessage } from '@/types/database';

// Define TS interfaces for Dexie tables
export interface CachedConversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
  members?: any[];
}

export interface CachedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_type: ChatMessage['attachment_type'];
  attachment_link: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
  updated_at: string;
  status?: 'sending' | 'sent' | 'error';
  temp_id?: string;
  reactions?: any[];
  reply_to?: any;
}

export interface CachedCourse {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  thumbnail_url: string | null;
  tags?: string[];
  total_xp: number;
  lesson_count: number;
}

export interface CachedLesson {
  id: string;
  course_id: string;
  title: string;
  youtube_url: string | null;
  notes: string | null;
  xp_reward: number;
  sort_order: number;
}

export interface OutboxMessage {
  temp_id: string;
  conversation_id: string;
  content: string | null;
  attachment_type: string | null;
  attachment_link: string | null;
  reply_to_id: string | null;
  created_at: string;
}

export interface UserPreference {
  key: string;
  value: any;
}

// Scoped Dexie database subclass
export class SmartLearnOfflineDb extends Dexie {
  conversations!: Table<CachedConversation, string>;
  messages!: Table<CachedMessage, string>;
  courses!: Table<CachedCourse, string>;
  lessons!: Table<CachedLesson, string>;
  outbox!: Table<OutboxMessage, string>;
  user_preferences!: Table<UserPreference, string>;

  constructor(userId: string) {
    // Unique user-scoped database naming avoids cross-user data leakage
    super(`smartlearn_cache_${userId}`);
    
    this.version(1).stores({
      conversations: 'id, updated_at, is_pinned',
      messages: 'id, conversation_id, sender_id, created_at, updated_at, status',
      courses: 'id, difficulty',
      lessons: 'id, course_id, sort_order',
      outbox: 'temp_id, conversation_id, created_at',
      user_preferences: 'key',
    });
  }
}

// Cache Instances Map
const dbInstancesMap = new Map<string, SmartLearnOfflineDb>();

export function getOfflineDb(userId: string): SmartLearnOfflineDb {
  if (!userId) {
    throw new Error('User ID is required to instantiate offline IndexedDB');
  }

  let db = dbInstancesMap.get(userId);
  if (!db) {
    db = new SmartLearnOfflineDb(userId);
    dbInstancesMap.set(userId, db);
  }
  return db;
}

/**
 * Completely purges all user cache database files on sign out.
 */
export async function clearOfflineCache(userId: string): Promise<boolean> {
  try {
    const db = dbInstancesMap.get(userId) || new SmartLearnOfflineDb(userId);
    dbInstancesMap.delete(userId);
    await db.delete();
    console.log(`IndexedDB smartlearn_cache_${userId} deleted successfully.`);
    return true;
  } catch (err) {
    console.error(`Failed to clear IndexedDB for user ${userId}:`, err);
    return false;
  }
}
