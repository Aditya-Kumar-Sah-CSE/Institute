import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'GEMINI_NOT_CONFIGURED',
          message: 'Gemini API key is not configured on the server.'
        },
        { status: 503 }
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
