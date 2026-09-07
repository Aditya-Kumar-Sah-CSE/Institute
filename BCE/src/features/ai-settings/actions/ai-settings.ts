'use server';

import { getUser, createAdminClient } from '@/lib/supabase/server';
import { encryptKey, decryptKey, maskKey } from '@/lib/security/encryption';
import { AIProviderName } from '@/lib/ai/providers/types';
import { GeminiProvider } from '@/lib/ai/providers/GeminiProvider';
import { GrokProvider } from '@/lib/ai/providers/GrokProvider';
import { getUserConnectedProvidersStatus } from '@/lib/ai/providers/factory';

export async function getAIProviderStatusAction() {
  const user = await getUser();
  if (!user) {
    return { success: false, message: 'Authentication required', activeProvider: null, providers: [] };
  }

  const status = await getUserConnectedProvidersStatus(user.id);
  return {
    success: true,
    activeProvider: status.activeProvider,
    providers: status.providers
  };
}

export async function saveAIProviderKeyAction(params: {
  provider: AIProviderName;
  apiKey: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: 'Authentication required. Please log in.' };
    }

    const { provider, apiKey } = params;
    const cleanKey = (apiKey || '').trim();

    if (!provider || (provider !== 'gemini' && provider !== 'grok')) {
      return { success: false, message: 'Invalid AI provider selected.' };
    }

    if (!cleanKey) {
      return { success: false, message: 'API key cannot be empty.' };
    }

    // 1. Test key connection BEFORE saving
    let testProvider;
    if (provider === 'grok') {
      testProvider = new GrokProvider(cleanKey);
    } else {
      testProvider = new GeminiProvider(cleanKey);
    }

    const testRes = await testProvider.testConnection();
    if (!testRes.success) {
      return {
        success: false,
        message: testRes.message
      };
    }

    // 2. Encrypt key & create mask
    const encryptedApiKey = encryptKey(cleanKey);
    const keyMask = maskKey(cleanKey);
    const admin = await createAdminClient();

    // 3. Save to database against user.id
    const { error: providerError } = await admin
      .from('user_ai_providers')
      .upsert({
        user_id: user.id,
        provider,
        encrypted_api_key: encryptedApiKey,
        key_mask: keyMask,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' });

    if (providerError) {
      console.error('[saveAIProviderKeyAction DB Error]:', providerError);
      return { success: false, message: 'Failed to save API key to secure storage.' };
    }

    // 4. Set as active provider
    await admin
      .from('user_ai_settings')
      .upsert({
        user_id: user.id,
        active_provider: provider,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    const providerTitle = provider === 'gemini' ? 'Gemini' : 'Grok';
    return {
      success: true,
      message: `✓ ${providerTitle} connected. Your AI Agent is ready.`,
      activeProvider: provider,
      keyMask
    };
  } catch (err: any) {
    console.error('[saveAIProviderKeyAction Exception]:', err);
    return {
      success: false,
      message: err?.message || 'An unexpected error occurred while saving your API key.'
    };
  }
}

export async function setActiveProviderAction(params: { provider: AIProviderName }) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: 'Authentication required.' };
    }

    const { provider } = params;
    if (provider !== 'gemini' && provider !== 'grok') {
      return { success: false, message: 'Invalid AI provider.' };
    }

    const admin = await createAdminClient();

    // Check if key exists for this provider
    const { data: keyRecord } = await admin
      .from('user_ai_providers')
      .select('provider')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (!keyRecord) {
      return {
        success: false,
        message: `Please connect your ${provider === 'gemini' ? 'Google Gemini' : 'xAI Grok'} API key first.`
      };
    }

    await admin
      .from('user_ai_settings')
      .upsert({
        user_id: user.id,
        active_provider: provider,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    const providerTitle = provider === 'gemini' ? 'Google Gemini' : 'xAI Grok';
    return {
      success: true,
      message: `Active provider changed to ${providerTitle}.`,
      activeProvider: provider
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to switch provider.' };
  }
}

export async function removeAIProviderKeyAction(params: { provider: AIProviderName }) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: 'Authentication required.' };
    }

    const { provider } = params;
    const admin = await createAdminClient();

    // Delete provider record completely
    const { error: deleteErr } = await admin
      .from('user_ai_providers')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (deleteErr) {
      return { success: false, message: 'Failed to delete key from database.' };
    }

    // Check remaining providers
    const { data: remaining } = await admin
      .from('user_ai_providers')
      .select('provider')
      .eq('user_id', user.id);

    let nextActive: AIProviderName | null = null;

    if (remaining && remaining.length > 0) {
      nextActive = remaining[0].provider as AIProviderName;
      await admin
        .from('user_ai_settings')
        .upsert({
          user_id: user.id,
          active_provider: nextActive,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } else {
      await admin
        .from('user_ai_settings')
        .delete()
        .eq('user_id', user.id);
    }

    const providerTitle = provider === 'gemini' ? 'Gemini' : 'Grok';
    return {
      success: true,
      message: `${providerTitle} API key removed completely.`,
      activeProvider: nextActive
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to remove API key.' };
  }
}

export async function testAIProviderConnectionAction(params: {
  provider: AIProviderName;
  apiKey?: string;
}) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: 'Authentication required.' };
    }

    const { provider, apiKey } = params;
    let keyToTest = (apiKey || '').trim();

    if (!keyToTest) {
      // Fetch stored key from DB
      const admin = await createAdminClient();
      const { data: rec } = await admin
        .from('user_ai_providers')
        .select('encrypted_api_key')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .maybeSingle();

      if (!rec || !rec.encrypted_api_key) {
        return {
          success: false,
          message: `No connected key found for ${provider === 'gemini' ? 'Gemini' : 'Grok'}.`
        };
      }
      keyToTest = decryptKey(rec.encrypted_api_key);
    }

    let testInstance;
    if (provider === 'grok') {
      testInstance = new GrokProvider(keyToTest);
    } else {
      testInstance = new GeminiProvider(keyToTest);
    }

    return await testInstance.testConnection();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Connection test failed.'
    };
  }
}
