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

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TRANSCRIPTION_FAILED',
          message: 'Speech transcription key unconfigured. Please type your command.'
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, errorCode: 'TRANSCRIPTION_FAILED', message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Limit audio file size to 10MB
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, errorCode: 'TRANSCRIPTION_FAILED', message: 'Audio file too large' },
        { status: 400 }
      );
    }

    // Send to Groq Whisper Speech-to-Text API
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile, audioFile.name || 'audio.webm');
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`
      },
      body: groqFormData
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[STT ERROR] Groq API returned:', errText);
      return NextResponse.json(
        {
          success: false,
          errorCode: 'TRANSCRIPTION_FAILED',
          message: 'Voice transcription error. Please try typing your command.'
        },
        { status: 500 }
      );
    }

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
      console.log('[STT SUCCESS]', { userId: user.id, audioSize: audioFile.size, transcript });
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
