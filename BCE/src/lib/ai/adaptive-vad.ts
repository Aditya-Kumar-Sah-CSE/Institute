/**
 * Adaptive Voice Activity Detector (VAD) with ambient noise calibration,
 * rolling noise floor estimation, signal-to-noise ratio (SNR) calculation,
 * and hysteresis debouncing for barge-in detection.
 */

export interface VADConfig {
  alpha?: number;             // Smoothing factor for noise floor EMA (0.01 - 0.05)
  snrThresholdDb?: number;    // Required SNR in dB to classify as speech (e.g., 6.0 dB)
  minSpeechRms?: number;      // Absolute minimum RMS floor to avoid silent mic triggers
  minSpeechFrames?: number;   // Consecutive speech frames (~40ms per frame) needed for trigger
  minSilenceFrames?: number;  // Consecutive silence frames needed before resetting speech state
}

export interface VADAnalysisResult {
  isSpeech: boolean;
  isBargeIn: boolean;
  rms: number;
  noiseFloor: number;
  snrDb: number;
}

export class AdaptiveVAD {
  private alpha: number;
  private snrThresholdDb: number;
  private minSpeechRms: number;
  private minSpeechFrames: number;
  private minSilenceFrames: number;

  private noiseFloor: number = 0.005; // Initial ambient noise floor baseline
  private speechFrameCount: number = 0;
  private silenceFrameCount: number = 0;
  private isSpeechActive: boolean = false;
  private isCalibrated: boolean = false;
  private calibrationFrames: number = 0;

  constructor(config: VADConfig = {}) {
    this.alpha = config.alpha ?? 0.02;
    this.snrThresholdDb = config.snrThresholdDb ?? 7.0;
    this.minSpeechRms = config.minSpeechRms ?? 0.015; // Filter out low ambient hum & key clicks
    this.minSpeechFrames = config.minSpeechFrames ?? 3;  // Require ~120ms of continuous speech energy
    this.minSilenceFrames = config.minSilenceFrames ?? 6;
  }

  /**
   * Process Float32 time-domain audio samples from AnalyserNode or AudioWorklet.
   * @param samples Float32Array of audio samples (-1.0 to 1.0)
   * @param isAssistantSpeaking boolean flag indicating whether AI assistant is playing audio
   */
  public processFloatSamples(samples: Float32Array, isAssistantSpeaking: boolean = false): VADAnalysisResult {
    let sumSquare = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquare += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquare / samples.length);
    return this.evaluateRms(rms, isAssistantSpeaking);
  }

  /**
   * Process Int16 PCM audio samples from AudioWorklet.
   * @param pcmInt16 Int16Array of PCM samples (-32768 to 32767)
   * @param isAssistantSpeaking boolean flag indicating whether AI assistant is playing audio
   */
  public processInt16Samples(pcmInt16: Int16Array, isAssistantSpeaking: boolean = false): VADAnalysisResult {
    let sumSquare = 0;
    for (let i = 0; i < pcmInt16.length; i++) {
      const normalized = pcmInt16[i] / 32768.0;
      sumSquare += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquare / pcmInt16.length);
    return this.evaluateRms(rms, isAssistantSpeaking);
  }

  /**
   * Core VAD evaluation algorithm with adaptive noise floor and hysteresis.
   */
  private evaluateRms(rms: number, isAssistantSpeaking: boolean): VADAnalysisResult {
    // Initial 15-frame (~500ms) noise floor calibration
    if (!this.isCalibrated) {
      this.calibrationFrames++;
      this.noiseFloor = (this.noiseFloor * (this.calibrationFrames - 1) + rms) / this.calibrationFrames;
      if (this.calibrationFrames >= 15) {
        this.isCalibrated = true;
        this.noiseFloor = Math.max(0.002, this.noiseFloor);
      }
    }

    // Update noise floor during quiet periods (when RMS is low and assistant is not speaking)
    if (!isAssistantSpeaking && rms < this.noiseFloor * 1.8 && rms < this.minSpeechRms) {
      this.noiseFloor = this.alpha * rms + (1 - this.alpha) * this.noiseFloor;
      this.noiseFloor = Math.max(0.001, this.noiseFloor);
    }

    // Calculate Signal-to-Noise Ratio (SNR) in dB
    const snrDb = 20 * Math.log10((rms + 1e-6) / (this.noiseFloor + 1e-6));

    // Dynamic threshold: speech requires RMS above minSpeechRms AND SNR above threshold
    const isSpeechCandidate = rms >= this.minSpeechRms && snrDb >= this.snrThresholdDb && rms > (this.noiseFloor * 2.2);

    // Hysteresis Debouncing
    if (isSpeechCandidate) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
      if (this.speechFrameCount >= this.minSpeechFrames) {
        this.isSpeechActive = true;
      }
    } else {
      this.silenceFrameCount++;
      if (this.silenceFrameCount >= this.minSilenceFrames) {
        this.speechFrameCount = 0;
        this.isSpeechActive = false;
      }
    }

    // Barge-in is triggered only when speech is active WHILE the assistant is speaking
    const isBargeIn = isAssistantSpeaking && this.isSpeechActive;

    return {
      isSpeech: this.isSpeechActive,
      isBargeIn,
      rms,
      noiseFloor: this.noiseFloor,
      snrDb
    };
  }

  public reset() {
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
    this.isSpeechActive = false;
  }
}
