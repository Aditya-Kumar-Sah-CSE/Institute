export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
}

export interface STTResponse {
  success: boolean;
  transcript?: string;
  errorCode?: 
    | 'MIC_PERMISSION_DENIED'
    | 'MIC_NOT_FOUND'
    | 'MIC_BUSY'
    | 'SECURITY_ERROR'
    | 'FEATURE_POLICY_DENIED'
    | 'OVERCONSTRAINED_ERROR'
    | 'UNSUPPORTED_BROWSER'
    | 'AUDIO_RECORDING_FAILED'
    | 'TRANSCRIPTION_FAILED'
    | 'TRANSCRIPTION_EMPTY'
    | 'MIC_ERROR';
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
  private isInitializing: boolean = false;

  public get activeStream(): MediaStream | null {
    return this.stream;
  }

  public get state(): string {
    if (this.mediaRecorder) return this.mediaRecorder.state;
    return 'inactive';
  }

  async start(): Promise<{ success: boolean; errorCode?: string; message?: string }> {
    // 1. Prevent duplicate initializations if stream/recorder is already active
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return { success: true };
    }

    if (this.isInitializing) {
      return { success: false, errorCode: 'MIC_BUSY', message: 'Microphone initialization is already in progress.' };
    }

    this.isInitializing = true;

    // 2. Check browser API support
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.isInitializing = false;
      return {
        success: false,
        errorCode: 'UNSUPPORTED_BROWSER',
        message: 'Microphone access is not supported in this browser environment.'
      };
    }

    // 3. Check secure context (HTTPS / localhost)
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      this.isInitializing = false;
      return {
        success: false,
        errorCode: 'SECURITY_ERROR',
        message: 'Microphone access requires a secure HTTPS context.'
      };
    }

    // 4. Check iframe feature policy if embedded
    const isIframe = window.self !== window.top;
    if (isIframe && (document as any).featurePolicy && typeof (document as any).featurePolicy.allowsFeature === 'function') {
      if (!(document as any).featurePolicy.allowsFeature('microphone')) {
        this.isInitializing = false;
        return {
          success: false,
          errorCode: 'FEATURE_POLICY_DENIED',
          message: 'Microphone access is blocked by the parent iframe policy.'
        };
      }
    }

    // Ensure any previous stale stream or recorder is fully cleaned up first
    this.cleanup();

    let acquiredStream: MediaStream | null = null;

    try {
      // Primary Microphone Access Test using getUserMedia
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (firstErr: any) {
        // Retry with plain { audio: true } if initial call threw OverconstrainedError
        if (firstErr.name === 'OverconstrainedError') {
          acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw firstErr;
        }
      }

      // 5. Verify acquired stream: audio tracks must exist and state must be 'live'
      const audioTracks = acquiredStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0 || audioTracks[0].readyState !== 'live') {
        if (acquiredStream) {
          acquiredStream.getTracks().forEach(t => t.stop());
        }
        this.isInitializing = false;
        return {
          success: false,
          errorCode: 'MIC_BUSY',
          message: 'Microphone track is not live or available.'
        };
      }

      this.stream = acquiredStream;
      this.audioChunks = [];
      const mimeType = getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // collect chunks every 100ms
      this.isInitializing = false;
      return { success: true };
    } catch (err: any) {
      this.cleanup();
      this.isInitializing = false;

      // Development-Only Diagnostic Logging
      if (process.env.NODE_ENV === 'development') {
        this.logDevDiagnostics(err, isSecure, isIframe);
      }

      // 6. Accurate Error Classification (NEVER map every error to permission blocked!)
      const errName = err.name || 'Error';
      const errMsg = err.message || 'Could not access microphone.';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        return {
          success: false,
          errorCode: 'MIC_PERMISSION_DENIED',
          message: 'Microphone permission was blocked. Please allow microphone access in your browser settings and try again.'
        };
      }

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        return {
          success: false,
          errorCode: 'MIC_NOT_FOUND',
          message: 'No microphone device was found.'
        };
      }

      if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        return {
          success: false,
          errorCode: 'MIC_BUSY',
          message: 'Microphone is currently being used or unavailable.'
        };
      }

      if (errName === 'SecurityError') {
        return {
          success: false,
          errorCode: 'SECURITY_ERROR',
          message: 'Microphone access requires a secure HTTPS context.'
        };
      }

      if (errName === 'OverconstrainedError') {
        return {
          success: false,
          errorCode: 'OVERCONSTRAINED_ERROR',
          message: 'Microphone device constraints could not be satisfied.'
        };
      }

      // For all other unknown errors, display the exact error name and message
      return {
        success: false,
        errorCode: 'MIC_ERROR',
        message: `${errName}: ${errMsg}`
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
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore track stop errors during cleanup
      }
      this.stream = null;
    }
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {
        // ignore recorder stop errors
      }
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
    this.isInitializing = false;
  }

  private async logDevDiagnostics(err: any, isSecure: boolean, isIframe: boolean) {
    try {
      let permState: string | undefined = undefined;
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          permState = status?.state;
        } catch (pe) {
          permState = 'query_unsupported';
        }
      }

      let audioDevices: MediaDeviceInfo[] = [];
      if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          audioDevices = devices.filter(d => d.kind === 'audioinput');
        } catch (de) {}
      }

      console.error('[AudioRecorder Dev Diagnostic]', {
        errorName: err.name,
        errorMessage: err.message,
        permissionState: permState,
        isSecureContext: isSecure,
        isIframe,
        availableAudioInputs: audioDevices.map(d => ({ label: d.label, id: d.deviceId }))
      });
    } catch (logErr) {
      console.error('[AudioRecorder Dev Diagnostic Error]', err);
    }
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
