/**
 * Client-side Web Audio API player for Gemini Live 24kHz PCM response streams.
 * Supports gapless scheduled playback, jitter buffering, underrun recovery,
 * gain node management, and instant barge-in cancellation.
 * Audio Graph: AudioBufferSourceNode -> GainNode -> AnalyserNode -> AudioContext.destination
 */

export interface GeminiAudioPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

export class GeminiAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying: boolean = false;
  private sampleRate: number = 24000;
  private callbacks: GeminiAudioPlayerCallbacks;
  private ownsAudioContext: boolean = true;
  private initialJitterBufferSec: number = 0.08; // 80ms initial buffer for network jitter
  private playbackEndTimer: NodeJS.Timeout | null = null;
  private totalChunksProcessed: number = 0;
  private totalDurationScheduled: number = 0;
  private sessionStartTime: number = 0;
  private firstAudioMs: number = 0;
  private lastChunkArrivalMs: number = 0;
  private maxQueueGapMs: number = 0;

  constructor(
    callbacks: GeminiAudioPlayerCallbacks = {}, 
    sampleRate: number = 24000,
    existingAudioCtx?: AudioContext | null
  ) {
    this.callbacks = callbacks;
    this.sampleRate = sampleRate;
    if (existingAudioCtx) {
      this.audioCtx = existingAudioCtx;
      this.ownsAudioContext = false;
      this.initAudioGraph();
    }
  }

  public prepare() {
    this.initAudioGraph();
  }

  private initAudioGraph() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.ownsAudioContext = true;
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((e) => {
        console.warn('[AUDIO] GeminiAudioPlayer AudioContext resume notice:', e);
      });
    }

    if (!this.gainNode && this.audioCtx) {
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }

    if (!this.analyserNode && this.audioCtx && this.gainNode) {
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.15;
      
      // Connect GainNode -> AnalyserNode -> Destination
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getAudioContextState(): string {
    return this.audioCtx ? this.audioCtx.state : 'none';
  }

  /**
   * Enqueue a chunk of base64 16-bit PCM audio (24kHz mono) for playback.
   */
  public playChunk(base64Pcm: string) {
    try {
      this.initAudioGraph();
      if (!this.audioCtx || !this.gainNode || !this.analyserNode) return;

      // Resume AudioContext if suspended by browser autoplay policy
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const float32Data = this.base64ToFloat32(base64Pcm);
      if (float32Data.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      
      // AUDIO GRAPH: source -> GainNode -> AnalyserNode -> AudioContext.destination
      source.connect(this.gainNode);

      const currentTime = this.audioCtx.currentTime;
      const nowMs = Date.now();

      if (this.totalChunksProcessed === 0) {
        this.sessionStartTime = nowMs;
        this.firstAudioMs = 0;
      } else if (this.firstAudioMs === 0) {
        this.firstAudioMs = Math.max(0, nowMs - this.sessionStartTime);
      }

      if (this.lastChunkArrivalMs > 0) {
        const gap = nowMs - this.lastChunkArrivalMs;
        if (gap > this.maxQueueGapMs) {
          this.maxQueueGapMs = gap;
        }
      }
      this.lastChunkArrivalMs = nowMs;

      // Cancel pending end timer if a new chunk arrives
      if (this.playbackEndTimer) {
        clearTimeout(this.playbackEndTimer);
        this.playbackEndTimer = null;
      }

      // Initial jitter buffer or underrun recovery
      if (!this.isPlaying || this.nextStartTime < currentTime) {
        if (this.isPlaying && this.nextStartTime < currentTime) {
          console.log(`[AUDIO UNDERRUN] Gap of ${(currentTime - this.nextStartTime).toFixed(3)}s detected. Rebasing nextStartTime.`);
        }
        // Apply initial jitter buffer offset (80ms) when starting
        this.nextStartTime = currentTime + (this.isPlaying ? 0.01 : this.initialJitterBufferSec);
      }

      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;
      this.totalChunksProcessed++;
      this.totalDurationScheduled += audioBuffer.duration;

      this.activeSources.add(source);

      if (process.env.NODE_ENV === 'development') {
        const leadMs = Math.round((this.nextStartTime - currentTime) * 1000);
        const totalAudioMs = Math.round(this.totalDurationScheduled * 1000);
        console.log('[TTS]', {
          firstAudioMs: this.firstAudioMs,
          totalAudioMs,
          queueGapMs: this.maxQueueGapMs
        });
        console.log('[AUDIO QUEUE]', {
          chunkIndex: this.totalChunksProcessed,
          bytes: base64Pcm.length,
          samples: float32Data.length,
          durationMs: Math.round(audioBuffer.duration * 1000),
          activeSources: this.activeSources.size,
          scheduledUntilSec: this.nextStartTime.toFixed(3),
          currentTimeSec: currentTime.toFixed(3),
          leadMs
        });
      }

      if (!this.isPlaying) {
        this.isPlaying = true;
        console.log('[AUDIO] Gemini playback started');
        this.callbacks.onPlaybackStart?.();
      }

      source.onended = () => {
        this.activeSources.delete(source);

        // Schedule playback end only when ALL sources finish and no new chunk arrives within grace period
        if (this.activeSources.size === 0) {
          if (this.playbackEndTimer) clearTimeout(this.playbackEndTimer);

          const remainingSec = Math.max(0, this.nextStartTime - (this.audioCtx?.currentTime || 0));
          this.playbackEndTimer = setTimeout(() => {
            if (this.activeSources.size === 0 && (this.audioCtx?.currentTime || 0) >= this.nextStartTime - 0.05) {
              this.isPlaying = false;
              console.log('[AUDIO] Gemini playback completed');
              this.callbacks.onPlaybackEnd?.();
            }
          }, Math.max(50, Math.round(remainingSec * 1000) + 150));
        }
      };
    } catch (err) {
      console.error('[GeminiAudioPlayer] Playback error:', err);
    }
  }

  /**
   * Instant barge-in: Stops all active audio source nodes immediately with a smooth fade out.
   */
  public stop() {
    if (this.playbackEndTimer) {
      clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }

    if (this.gainNode && this.audioCtx && this.audioCtx.state === 'running') {
      try {
        const now = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0.001, now + 0.03); // 30ms smooth fade
      } catch (e) {}
    }

    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch (e) {}
    }
    this.activeSources.clear();
    this.nextStartTime = 0;

    // Reset gain back to 1.0 for future playback
    if (this.gainNode && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(1.0, now + 0.04);
      } catch (e) {}
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      console.log('[AUDIO] Gemini playback stopped');
      this.callbacks.onPlaybackEnd?.();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public close() {
    this.stop();
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch (e) {}
      this.gainNode = null;
    }
    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch (e) {}
      this.analyserNode = null;
    }
    if (this.ownsAudioContext && this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
  }

  private base64ToFloat32(base64: string): Float32Array {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      if (len === 0) return new Float32Array(0);

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        const sample = int16[i];
        const norm = sample < 0 ? sample / 32768.0 : sample / 32767.0;
        float32[i] = Math.max(-1.0, Math.min(1.0, norm));
      }
      return float32;
    } catch (e) {
      console.error('[GeminiAudioPlayer] PCM decoding error:', e);
      return new Float32Array(0);
    }
  }
}

