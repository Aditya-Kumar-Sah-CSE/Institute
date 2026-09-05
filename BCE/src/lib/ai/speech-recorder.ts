export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
}

export interface STTResponse {
  success: boolean;
  transcript?: string;
  errorCode?: 'MIC_PERMISSION_DENIED' | 'MIC_UNAVAILABLE' | 'UNSUPPORTED_BROWSER' | 'AUDIO_RECORDING_FAILED' | 'TRANSCRIPTION_FAILED' | 'TRANSCRIPTION_EMPTY';
  message?: string;
}

export function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'audio/webm';
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav'
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm';
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<{ success: boolean; errorCode?: string; message?: string }> {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        errorCode: 'UNSUPPORTED_BROWSER',
        message: 'Voice recording is not supported in this browser. You can use text.'
      };
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      const mimeType = getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // collect chunks every 100ms
      return { success: true };
    } catch (err: any) {
      this.cleanup();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          success: false,
          errorCode: 'MIC_PERMISSION_DENIED',
          message: 'Microphone permission was blocked. Please allow microphone access in your browser settings and try again.'
        };
      }

      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return {
          success: false,
          errorCode: 'MIC_UNAVAILABLE',
          message: 'No microphone was detected on this device.'
        };
      }

      return {
        success: false,
        errorCode: 'AUDIO_RECORDING_FAILED',
        message: err.message || 'Could not start audio recording.'
      };
    }
  }

  stop(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.cleanup();
        return reject(new Error('Recorder not initialized'));
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = getSupportedMimeType();
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve({ blob, mimeType });
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          const mimeType = getSupportedMimeType();
          const blob = new Blob(this.audioChunks, { type: mimeType });
          this.cleanup();
          resolve({ blob, mimeType });
        }
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  cancel() {
    this.cleanup();
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export async function transcribeAudioFile(blob: Blob, mimeType: string): Promise<STTResponse> {
  try {
    const formData = new FormData();
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', blob, `recording.${ext}`);

    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      errorCode: 'TRANSCRIPTION_FAILED',
      message: 'Network error while uploading audio for transcription.'
    };
  }
}
