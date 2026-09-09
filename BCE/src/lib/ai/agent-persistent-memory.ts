/**
 * Smart Learn Agent — Persistent Memory & Reminders
 * 
 * Server-side functions for DB-backed persistent agent memory.
 * Falls back to localStorage if Supabase is unavailable.
 * 
 * Tables required:
 *   agent_memory (id, user_id, key, value, category, created_at, updated_at)
 *   agent_reminders (id, user_id, message, trigger_at, status, created_at)
 */

import { createAdminClient } from '@/lib/supabase/server';

// ─── Types ───

export interface AgentMemoryEntry {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AgentReminder {
  id: string;
  user_id: string;
  message: string;
  trigger_at: string;
  status: 'pending' | 'triggered' | 'dismissed';
  created_at: string;
}

// ─── Memory Operations ───

/**
 * Save a fact/note to persistent agent memory.
 */
export async function saveAgentFact(
  userId: string,
  key: string,
  value: string,
  category: string = 'general'
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const adminClient = await createAdminClient();

    // Upsert: update if same key+category exists, insert otherwise
    const { data: existing } = await adminClient
      .from('agent_memory')
      .select('id')
      .eq('user_id', userId)
      .eq('key', key)
      .eq('category', category)
      .maybeSingle();

    if (existing) {
      const { error } = await adminClient
        .from('agent_memory')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (error) return { success: false, message: `Memory update failed: ${error.message}` };
      return { success: true, message: `Memory updated: "${key}"`, id: existing.id };
    }

    const { data, error } = await adminClient
      .from('agent_memory')
      .insert({
        user_id: userId,
        key,
        value,
        category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) return { success: false, message: `Memory save failed: ${error.message}` };
    return { success: true, message: `Memorized: "${key}"`, id: data?.id };
  } catch (err: any) {
    // Fallback: use localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const storageKey = `agent_memory_${userId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push({ key, value, category, timestamp: Date.now() });
      localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50))); // Cap at 50
      return { success: true, message: `Memorized (local): "${key}"` };
    }
    return { success: false, message: `Memory save failed: ${err?.message || 'Unknown error'}` };
  }
}

/**
 * Search and recall stored facts/notes.
 */
export async function recallAgentFacts(
  userId: string,
  query: string,
  limit: number = 10
): Promise<{ success: boolean; message: string; facts: AgentMemoryEntry[] }> {
  try {
    const adminClient = await createAdminClient();

    // Full-text search across key and value columns
    const { data, error } = await adminClient
      .from('agent_memory')
      .select('*')
      .eq('user_id', userId)
      .or(`key.ilike.%${query}%,value.ilike.%${query}%,category.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, message: `Memory recall failed: ${error.message}`, facts: [] };
    }

    const facts = (data || []) as AgentMemoryEntry[];
    if (facts.length === 0) {
      return { success: true, message: 'No matching memories found.', facts: [] };
    }

    const formatted = facts.map((f, i) => `${i + 1}. **${f.key}**: ${f.value} (${f.category})`).join('\n');
    return {
      success: true,
      message: `🧠 **Recalled ${facts.length} memories:**\n\n${formatted}`,
      facts
    };
  } catch (err: any) {
    // Fallback: localStorage search
    if (typeof window !== 'undefined') {
      const storageKey = `agent_memory_${userId}`;
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const q = query.toLowerCase();
      const matched = stored.filter((m: any) =>
        m.key?.toLowerCase().includes(q) ||
        m.value?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q)
      );
      if (matched.length === 0) {
        return { success: true, message: 'No matching memories found (local).', facts: [] };
      }
      const formatted = matched.map((m: any, i: number) => `${i + 1}. **${m.key}**: ${m.value}`).join('\n');
      return { success: true, message: `🧠 **Recalled (local):**\n\n${formatted}`, facts: matched };
    }
    return { success: false, message: `Memory recall failed: ${err?.message || 'Unknown'}`, facts: [] };
  }
}

/**
 * Clear agent memory entries.
 */
export async function clearAgentFacts(
  userId: string,
  category?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const adminClient = await createAdminClient();
    let query = adminClient.from('agent_memory').delete().eq('user_id', userId);
    if (category) {
      query = query.eq('category', category);
    }
    const { error } = await query;
    if (error) return { success: false, message: `Clear failed: ${error.message}` };
    return { success: true, message: category ? `Cleared "${category}" memories.` : 'All memories cleared.' };
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`agent_memory_${userId}`);
      return { success: true, message: 'Local memories cleared.' };
    }
    return { success: false, message: `Clear failed: ${err?.message || 'Unknown'}` };
  }
}

// ─── Reminder Operations ───

/**
 * Schedule a future reminder.
 */
export async function setAgentReminder(
  userId: string,
  message: string,
  triggerAt?: string | Date
): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    const adminClient = await createAdminClient();

    // Default: remind in 1 hour if no time specified
    const triggerTime = triggerAt
      ? (typeof triggerAt === 'string' ? triggerAt : triggerAt.toISOString())
      : new Date(Date.now() + 3600_000).toISOString();

    const { data, error } = await adminClient
      .from('agent_reminders')
      .insert({
        user_id: userId,
        message,
        trigger_at: triggerTime,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) return { success: false, message: `Reminder failed: ${error.message}` };

    const readableTime = new Date(triggerTime).toLocaleString();
    return { success: true, message: `⏰ Reminder set: "${message}" at ${readableTime}`, id: data?.id };
  } catch (err: any) {
    return { success: false, message: `Reminder failed: ${err?.message || 'Unknown error'}` };
  }
}

/**
 * Get active/pending reminders for a user.
 */
export async function getActiveReminders(
  userId: string
): Promise<{ success: boolean; message: string; reminders: AgentReminder[] }> {
  try {
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient
      .from('agent_reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('trigger_at', { ascending: true })
      .limit(20);

    if (error) return { success: false, message: `Reminders fetch failed: ${error.message}`, reminders: [] };

    const reminders = (data || []) as AgentReminder[];
    if (reminders.length === 0) {
      return { success: true, message: 'No active reminders.', reminders: [] };
    }

    const list = reminders.map((r, i) => {
      const time = new Date(r.trigger_at).toLocaleString();
      return `${i + 1}. ⏰ "${r.message}" — ${time}`;
    }).join('\n');

    return {
      success: true,
      message: `📋 **Active Reminders (${reminders.length}):**\n\n${list}`,
      reminders
    };
  } catch (err: any) {
    return { success: false, message: `Reminders fetch failed: ${err?.message || 'Unknown'}`, reminders: [] };
  }
}

/**
 * Dismiss a specific reminder.
 */
export async function dismissReminder(
  reminderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('agent_reminders')
      .update({ status: 'dismissed' })
      .eq('id', reminderId);

    if (error) return { success: false, message: `Dismiss failed: ${error.message}` };
    return { success: true, message: 'Reminder dismissed.' };
  } catch (err: any) {
    return { success: false, message: `Dismiss failed: ${err?.message || 'Unknown'}` };
  }
}
