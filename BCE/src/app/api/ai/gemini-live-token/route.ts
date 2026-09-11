import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { getUserAIProvider } from '@/lib/ai/providers/factory';

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userBYOK = await getUserAIProvider(user.id);
    let apiKey: string | undefined = undefined;

    if (userBYOK && userBYOK.activeProvider === 'gemini' && userBYOK.provider?.apiKey) {
      apiKey = userBYOK.provider.apiKey;
    } else if (process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    } else if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'GEMINI_NOT_CONNECTED',
          message: 'Connect Google Gemini API key in Settings -> AI Agent to use live voice.'
        },
        { status: 400 }
      );
    }

    const serverAi = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    // Create a single-use ephemeral auth token for client WebSocket connection
    const tokenResponse = await serverAi.authTokens.create({
      config: {
        uses: 1
      }
    });

    if (!tokenResponse || !tokenResponse.name) {
      throw new Error('Failed to obtain ephemeral token from Gemini');
    }

    // Normalize token format to start with 'auth_tokens/' prefix as expected by @google/genai SDK
    const rawToken = tokenResponse.name;
    const normalizedToken = rawToken.startsWith('authTokens/')
      ? rawToken.replace(/^authTokens\//, 'auth_tokens/')
      : rawToken.startsWith('auth_tokens/')
        ? rawToken
        : `auth_tokens/${rawToken}`;

    console.log('[GeminiLiveToken] Token generated successfully:', {
      rawTokenPrefix: rawToken.substring(0, 12),
      normalizedPrefix: normalizedToken.substring(0, 12)
    });

    return NextResponse.json({
      success: true,
      token: normalizedToken,
      userId: user.id
    });
  } catch (error: any) {
    console.error('[Gemini Live Token API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'TOKEN_CREATION_FAILED',
        message: error?.message || 'Failed to create Gemini Live session token'
      },
      { status: 500 }
    );
  }
}
