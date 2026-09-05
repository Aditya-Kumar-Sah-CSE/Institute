import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 1. Check server-side STT API Key (GROQ_API_KEY or OPENAI_API_KEY)
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[STT CONFIG CHECK] TRANSCRIPTION_API_KEY configured: false');
      }
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TRANSCRIPTION_NOT_CONFIGURED',
          message: 'Voice transcription is not configured. Please contact the administrator.'
        },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[STT CONFIG CHECK] TRANSCRIPTION_API_KEY configured: true');
    }

    // 2. Extract audio blob from FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { success: false, errorCode: 'TRANSCRIPTION_FAILED', message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Limit audio file size to 10MB
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, errorCode: 'TRANSCRIPTION_FAILED', message: 'Audio file too large (max 10MB)' },
        { status: 400 }
      );
    }

    // 3. Prepare FormData for Groq Speech-to-Text (Whisper)
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile, audioFile.name || 'recording.webm');
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('response_format', 'json');

    let groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: groqFormData
    });

    // If whisper-large-v3-turbo fails, retry with fallback model whisper-large-v3
    if (!groqRes.ok) {
      const firstErrText = await groqRes.text();
      if (process.env.NODE_ENV === 'development') {
        console.warn('[STT RETRY] Primary model whisper-large-v3-turbo failed, retrying with whisper-large-v3:', firstErrText);
      }

      const fallbackFormData = new FormData();
      fallbackFormData.append('file', audioFile, audioFile.name || 'recording.webm');
      fallbackFormData.append('model', 'whisper-large-v3');
      fallbackFormData.append('response_format', 'json');

      groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: fallbackFormData
      });

      if (!groqRes.ok) {
        const finalErrText = await groqRes.text();
        console.error('[STT ERROR] Groq API returned error:', finalErrText);
        return NextResponse.json(
          {
            success: false,
            errorCode: 'TRANSCRIPTION_FAILED',
            message: 'Voice transcription service error. Please try again or type your command.'
          },
          { status: 500 }
        );
      }
    }

    // 4. Parse Groq STT Transcript JSON
    const data = await groqRes.json();
    const transcript = (data.text || '').trim();

    if (!transcript) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TRANSCRIPTION_EMPTY',
          message: 'No speech was detected. Please speak clearly and try again.'
        },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[STT SUCCESS]', { userId: user.id, audioSize: audioFile.size, transcriptLength: transcript.length });
    }

    return NextResponse.json({
      success: true,
      transcript
    });

  } catch (err: any) {
    console.error('Error in /api/ai/transcribe:', err);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'TRANSCRIPTION_FAILED',
        message: err.message || 'Speech transcription failed.'
      },
      { status: 500 }
    );
  }
}
