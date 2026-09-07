import { createAdminClient } from '@/lib/supabase/server';
import { decryptKey } from '@/lib/security/encryption';
import { AIProvider, AIProviderName } from './types';
import { GeminiProvider } from './GeminiProvider';
import { GrokProvider } from './GrokProvider';

export interface UserAIProviderInfo {
  provider: AIProvider;
  activeProvider: AIProviderName;
  keyMask: string;
}

export interface ConnectedProviderStatus {
  provider: AIProviderName;
  keyMask: string;
  isActive: boolean;
  updatedAt: string;
}

/**
 * Loads the active connected BYOK AI Provider for the authenticated user.
 * Returns null if user has not connected any API key.
 */
export async function getUserAIProvider(userId: string): Promise<UserAIProviderInfo | null> {
  if (!userId || userId === 'guest') return null;

  try {
    const admin = await createAdminClient();

    // 1. Get active provider setting
    const { data: setting } = await admin
      .from('user_ai_settings')
      .select('active_provider')
      .eq('user_id', userId)
      .maybeSingle();

    const preferredProvider: AIProviderName | null = setting?.active_provider || null;

    // 2. Fetch user's API key record
    let providerRecord = null;

    if (preferredProvider) {
      const { data: rec } = await admin
        .from('user_ai_providers')
        .select('provider, encrypted_api_key, key_mask')
        .eq('user_id', userId)
        .eq('provider', preferredProvider)
        .maybeSingle();
      providerRecord = rec;
    }

    // Fallback: If preferred provider record is missing, pick any provider record connected by user
    if (!providerRecord) {
      const { data: anyRec } = await admin
        .from('user_ai_providers')
        .select('provider, encrypted_api_key, key_mask')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      providerRecord = anyRec;
    }

    if (!providerRecord || !providerRecord.encrypted_api_key) {
      return null;
    }

    // 3. Decrypt key securely on server
    const plainApiKey = decryptKey(providerRecord.encrypted_api_key);
    const providerName: AIProviderName = providerRecord.provider as AIProviderName;

    // 4. Instantiate provider
    let providerInstance: AIProvider;
    if (providerName === 'grok') {
      providerInstance = new GrokProvider(plainApiKey);
    } else {
      providerInstance = new GeminiProvider(plainApiKey);
    }

    return {
      provider: providerInstance,
      activeProvider: providerName,
      keyMask: providerRecord.key_mask
    };
  } catch (err) {
    console.error('[getUserAIProvider Error]:', err);
    return null;
  }
}

/**
 * Retrieves safe status list of connected providers for UI without exposing decrypted keys.
 */
export async function getUserConnectedProvidersStatus(userId: string): Promise<{
  activeProvider: AIProviderName | null;
  providers: ConnectedProviderStatus[];
}> {
  if (!userId || userId === 'guest') {
    return { activeProvider: null, providers: [] };
  }

  try {
    const admin = await createAdminClient();

    const [{ data: setting }, { data: keys }] = await Promise.all([
      admin.from('user_ai_settings').select('active_provider').eq('user_id', userId).maybeSingle(),
      admin.from('user_ai_providers').select('provider, key_mask, updated_at').eq('user_id', userId)
    ]);

    const activeProvider = (setting?.active_provider as AIProviderName) || (keys && keys.length > 0 ? (keys[0].provider as AIProviderName) : null);

    const providersList: ConnectedProviderStatus[] = (keys || []).map(k => ({
      provider: k.provider as AIProviderName,
      keyMask: k.key_mask,
      isActive: activeProvider === k.provider,
      updatedAt: k.updated_at
    }));

    return {
      activeProvider,
      providers: providersList
    };
  } catch (err) {
    console.error('[getUserConnectedProvidersStatus Error]:', err);
    return { activeProvider: null, providers: [] };
  }
}
