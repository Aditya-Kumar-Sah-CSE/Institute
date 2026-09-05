/**
 * Client-side Web Audio API player for Gemini Live 24kHz PCM response streams.
 * Supports gapless scheduled playback and instant barge-in cancellation.
 */

export interface GeminiAudioPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

export class GeminiAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying: boolean = false;
  private sampleRate: number = 24000;
  private callbacks: GeminiAudioPlayerCallbacks;

  constructor(callbacks: GeminiAudioPlayerCallbacks = {}, sampleRate: number = 24000) {
    this.callbacks = callbacks;
    this.sampleRate = sampleRate;
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  public prepare() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((e) => {
        console.warn('[GeminiAudioPlayer] AudioContext resume error:', e);
      });
    }
  }

  /**
   * Enqueue a chunk of base64 16-bit PCM audio (24kHz mono) for playback.
   */
  public playChunk(base64Pcm: string) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const float32Data = this.base64ToFloat32(base64Pcm);
      if (float32Data.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      // Schedule chunk continuously
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.add(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.callbacks.onPlaybackStart?.();
      }

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0 && this.audioCtx && this.audioCtx.currentTime >= this.nextStartTime - 0.05) {
          this.isPlaying = false;
          this.callbacks.onPlaybackEnd?.();
        }
      };
    } catch (err) {
      console.error('[GeminiAudioPlayer] Playback error:', err);
    }
  }

  /**
   * Instant barge-in: Stops all active audio source nodes immediately.
   */
  public stop() {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;

    if (this.isPlaying) {
      this.isPlaying = false;
      this.callbacks.onPlaybackEnd?.();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public close() {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private base64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
    }
    return float32;
  }
}
