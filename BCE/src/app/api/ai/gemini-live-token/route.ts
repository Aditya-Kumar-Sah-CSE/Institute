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
    if (!userBYOK || userBYOK.activeProvider !== 'gemini') {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'GEMINI_NOT_CONNECTED',
          message: 'Connect Google Gemini API key in Settings -> AI Agent to use live voice.'
        },
        { status: 400 }
      );
    }

    const apiKey = userBYOK.provider.apiKey;
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

    return NextResponse.json({
      success: true,
      token: tokenResponse.name,
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
