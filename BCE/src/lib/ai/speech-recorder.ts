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
    | 'TRANSCRIPTION_NOT_CONFIGURED'
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

/**
 * Web Audio Real-Time Audio Energy & RMS Analyzer with Dynamic Noise Floor Calibration
 */
export class AudioEnergyAnalyzer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  public noiseFloor: number = 0.005;
  public speechThreshold: number = 0.018;
  public silenceThreshold: number = 0.008;
  public bargeInThreshold: number = 0.035;

  constructor(stream: MediaStream) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.3;

        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.source.connect(this.analyser);
      }
    } catch (e) {
      console.warn('[AudioEnergyAnalyzer Init Warning]', e);
    }
  }

  public getRMS(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  public calibrate(ambientSamples: number[]) {
    if (ambientSamples.length === 0) return;
    const avg = ambientSamples.reduce((a, b) => a + b, 0) / ambientSamples.length;
    this.noiseFloor = Math.max(0.003, avg);

    // Dynamic Hysteresis Thresholds
    this.speechThreshold = Math.max(0.015, this.noiseFloor * 2.5);
    this.silenceThreshold = Math.max(0.007, this.noiseFloor * 1.3);
    this.bargeInThreshold = Math.max(0.035, this.noiseFloor * 4.0);

    if (process.env.NODE_ENV === 'development') {
      console.log('[VAD CALIBRATION]', {
        noiseFloor: this.noiseFloor.toFixed(4),
        speechThreshold: this.speechThreshold.toFixed(4),
        silenceThreshold: this.silenceThreshold.toFixed(4),
        bargeInThreshold: this.bargeInThreshold.toFixed(4)
      });
    }
  }

  public dispose() {
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) {}
      this.analyser = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
  }
}

/**
 * Segment-Based Persistent Microphone Recorder
 */
export class AudioSegmentRecorder {
  private persistentStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private headerChunk: Blob | null = null;
  private recentChunks: Blob[] = [];
  private segmentStartIndex: number | null = null;
  private isInitializing: boolean = false;
  public analyzer: AudioEnergyAnalyzer | null = null;

  public get stream(): MediaStream | null {
    return this.persistentStream;
  }

  public get state(): string {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }

  async acquirePersistentStream(): Promise<{ success: boolean; errorCode?: string; message?: string }> {
    if (this.persistentStream && this.persistentStream.active && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      return { success: true };
    }

    if (this.isInitializing) {
      return { success: false, errorCode: 'MIC_BUSY', message: 'Microphone initialization in progress.' };
    }

    this.isInitializing = true;

    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.isInitializing = false;
      return { success: false, errorCode: 'UNSUPPORTED_BROWSER', message: 'Microphone is not supported in this browser.' };
    }

    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      this.isInitializing = false;
      return { success: false, errorCode: 'SECURITY_ERROR', message: 'Microphone access requires a secure HTTPS context.' };
    }

    const isIframe = window.self !== window.top;
    if (isIframe && (document as any).featurePolicy && typeof (document as any).featurePolicy.allowsFeature === 'function') {
      if (!(document as any).featurePolicy.allowsFeature('microphone')) {
        this.isInitializing = false;
        return { success: false, errorCode: 'FEATURE_POLICY_DENIED', message: 'Microphone access is blocked by the parent iframe policy.' };
      }
    }

    try {
      let acquiredStream: MediaStream | null = null;
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (firstErr: any) {
        if (firstErr.name === 'OverconstrainedError') {
          acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw firstErr;
        }
      }

      const audioTracks = acquiredStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0 || audioTracks[0].readyState !== 'live') {
        acquiredStream.getTracks().forEach(t => t.stop());
        this.isInitializing = false;
        return { success: false, errorCode: 'MIC_BUSY', message: 'Microphone audio track is inactive or unavailable.' };
      }

      this.persistentStream = acquiredStream;
      this.analyzer = new AudioEnergyAnalyzer(this.persistentStream);

      // Initialize continuous MediaRecorder
      const mimeType = getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.persistentStream, { mimeType });
      this.headerChunk = null;
      this.recentChunks = [];
      this.segmentStartIndex = null;

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          if (!this.headerChunk) {
            this.headerChunk = e.data;
          }
          this.recentChunks.push(e.data);
          if (this.recentChunks.length > 60) {
            this.recentChunks.shift();
            if (this.segmentStartIndex !== null && this.segmentStartIndex > 0) {
              this.segmentStartIndex--;
            }
          }
        }
      };

      this.mediaRecorder.start(100);
      this.isInitializing = false;
      return { success: true };
    } catch (err: any) {
      this.dispose();
      this.isInitializing = false;

      const errName = err.name || 'Error';
      const errMsg = err.message || 'Could not access microphone.';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        return { success: false, errorCode: 'MIC_PERMISSION_DENIED', message: 'Microphone permission was blocked. Please allow microphone access in your browser settings and try again.' };
      }
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        return { success: false, errorCode: 'MIC_NOT_FOUND', message: 'No microphone device was found.' };
      }
      if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        return { success: false, errorCode: 'MIC_BUSY', message: 'Microphone is currently being used or unavailable.' };
      }
      if (errName === 'SecurityError') {
        return { success: false, errorCode: 'SECURITY_ERROR', message: 'Microphone access requires a secure HTTPS context.' };
      }

      return { success: false, errorCode: 'MIC_ERROR', message: `${errName}: ${errMsg}` };
    }
  }

  startSegmentRecording() {
    // Capture pre-roll (~300ms = 3 chunks prior to current end)
    const preRollCount = 3;
    this.segmentStartIndex = Math.max(0, this.recentChunks.length - preRollCount);
  }

  stopSegmentRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (this.segmentStartIndex === null || this.recentChunks.length === 0) {
        this.segmentStartIndex = null;
        return resolve(null);
      }

      const mimeType = getSupportedMimeType();
      const rawSegment = this.recentChunks.slice(this.segmentStartIndex);
      this.segmentStartIndex = null;

      if (rawSegment.length === 0) {
        return resolve(null);
      }

      // Ensure headerChunk is at index 0 for valid WebM container metadata
      const speechBody = (this.headerChunk && rawSegment[0] === this.headerChunk) ? rawSegment.slice(1) : rawSegment;
      const finalChunks = this.headerChunk ? [this.headerChunk, ...speechBody] : rawSegment;
      const blob = new Blob(finalChunks, { type: mimeType });

      resolve(blob.size > 100 ? blob : null);
    });
  }

  dispose() {
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mediaRecorder = null;
    }

    if (this.persistentStream) {
      try {
        this.persistentStream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      this.persistentStream = null;
    }

    if (this.analyzer) {
      this.analyzer.dispose();
      this.analyzer = null;
    }

    this.headerChunk = null;
    this.recentChunks = [];
    this.segmentStartIndex = null;
    this.isInitializing = false;
  }
}

/**
 * Single-Session Audio Recorder (Backwards Compatibility Wrapper)
 */
export class AudioRecorder {
  private segmentRecorder: AudioSegmentRecorder = new AudioSegmentRecorder();

  public get activeStream(): MediaStream | null {
    return this.segmentRecorder.stream;
  }

  public get state(): string {
    return this.segmentRecorder.state;
  }

  async start(): Promise<{ success: boolean; errorCode?: string; message?: string }> {
    const res = await this.segmentRecorder.acquirePersistentStream();
    if (res.success) {
      this.segmentRecorder.startSegmentRecording();
    }
    return res;
  }

  async stop(): Promise<AudioRecordingResult> {
    const blob = await this.segmentRecorder.stopSegmentRecording();
    const mimeType = getSupportedMimeType();
    this.segmentRecorder.dispose();
    return { blob: blob || new Blob([], { type: mimeType }), mimeType };
  }

  cancel() {
    this.segmentRecorder.dispose();
  }
}

import { parseAgentJsonResponse } from './safe-stringify';

export async function transcribeAudioFile(
  blob: Blob, 
  mimeType: string, 
  abortSignal?: AbortSignal
): Promise<STTResponse> {
  try {
    const formData = new FormData();
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    formData.append('audio', blob, `recording.${ext}`);

    const res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      body: formData,
      signal: abortSignal
    });

    const parsed = await parseAgentJsonResponse(res);
    if (!parsed.success || !parsed.data) {
      return {
        success: false,
        errorCode: 'TRANSCRIPTION_FAILED',
        message: parsed.error || 'Transcription server returned an error.'
      };
    }
    return parsed.data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        errorCode: 'TRANSCRIPTION_FAILED',
        message: 'Transcription request cancelled.'
      };
    }
    return {
      success: false,
      errorCode: 'TRANSCRIPTION_FAILED',
      message: 'Network error while uploading audio for transcription.'
    };
  }
}
