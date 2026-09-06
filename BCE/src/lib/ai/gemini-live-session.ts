import { GoogleGenAI, Modality } from '@google/genai';
import { GEMINI_TOOL_DECLARATIONS } from './agent-tool-declarations';
import { GeminiAudioPlayer } from './gemini-audio-player';

export type VoiceConnectionState = 'starting' | 'connecting' | 'connected' | 'ready' | 'error' | 'stopped' | 'closed';

export interface GeminiLiveSessionCallbacks {
  onStateChange?: (state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING_AI' | 'STOPPED') => void;
  onConnectionStateChange?: (state: VoiceConnectionState) => void;
  onUserMessage?: (text: string) => void;
  onAssistantTextChunk?: (chunk: string) => void;
  onAssistantTextComplete?: (fullText: string) => void;
  onToolExecuted?: (toolName: string, result: any) => void;
  onError?: (err: string) => void;
  onClose?: () => void;
}

export class GeminiLiveSession {
  private session: any = null;
  private audioPlayer: GeminiAudioPlayer | null = null;
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private inputAnalyserNode: AnalyserNode | null = null;
  private isStopped: boolean = false;
  private isReady: boolean = false;
  private currentAssistantText: string = '';
  private callbacks: GeminiLiveSessionCallbacks;
  private pageContext: any;
  private studentProfile: any;
  private ownsAudioContext: boolean = true;
  private sessionId: number = 0;
  private lastSendLogTimer: number = 0;

  constructor(
    callbacks: GeminiLiveSessionCallbacks = {},
    pageContext?: any,
    studentProfile?: any,
    existingAudioCtx?: AudioContext | null,
    sessionId: number = 0
  ) {
    this.callbacks = callbacks;
    this.pageContext = pageContext;
    this.studentProfile = studentProfile;
    this.sessionId = sessionId;
    if (existingAudioCtx) {
      this.audioCtx = existingAudioCtx;
      this.ownsAudioContext = false;
    }
  }

  public async start() {
    try {
      this.isStopped = false;
      this.isReady = false;
      this.callbacks.onConnectionStateChange?.('starting');
      this.callbacks.onStateChange?.('THINKING');

      console.log('[VOICE START]', {
        sessionId: this.sessionId,
        audioContextState: this.audioCtx?.state || 'none',
        sampleRate: this.audioCtx?.sampleRate || 0
      });

      // 1. Acquire Microphone MediaStream & Initialize Input Analyser + AudioWorklet FIRST
      await this.startMicrophoneStream();
      if (this.isStopped) return;

      // 2. Fetch ephemeral token from server
      this.callbacks.onConnectionStateChange?.('connecting');
      const tokenRes = await fetch('/api/ai/gemini-live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.message || 'Failed to initialize Gemini Live session token.');
      }

      if (this.isStopped) return;

      // 3. Initialize Audio Player with shared AudioContext
      this.audioPlayer = new GeminiAudioPlayer(
        {
          onPlaybackStart: () => {
            if (!this.isStopped) this.callbacks.onStateChange?.('SPEAKING_AI');
          },
          onPlaybackEnd: () => {
            if (!this.isStopped) this.callbacks.onStateChange?.('LISTENING');
          }
        },
        24000,
        this.audioCtx
      );

      // 4. Format Tools Declarations from Client-Safe Schema
      const toolsDeclarations = GEMINI_TOOL_DECLARATIONS;

      // 5. Build System Instruction
      const systemInstructionText = this.buildSystemPrompt();

      // 6. Connect to Gemini Live WebSocket
      const clientAi = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1alpha' }
      });

      console.log('[GEMINI WS] created', {
        model: 'gemini-2.5-flash-native-audio-latest',
        apiVersion: 'v1alpha'
      });

      this.session = await clientAi.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          tools: [{ functionDeclarations: toolsDeclarations as any }]
        },
        callbacks: {
          onopen: () => {
            console.log('[GEMINI WS] OPEN');
            console.log('[GEMINI WS] setup sent');
            this.callbacks.onConnectionStateChange?.('connected');
            if (!this.isStopped) {
              // Mark session ready to transmit microphone PCM stream
              this.isReady = true;
              this.callbacks.onConnectionStateChange?.('ready');
              this.callbacks.onStateChange?.('LISTENING');
            }
          },
          onmessage: (msg: any) => {
            this.handleServerMessage(msg);
          },
          onerror: (err: any) => {
            console.error('[GEMINI WS] ERROR:', err);
            this.callbacks.onConnectionStateChange?.('error');
            this.callbacks.onError?.(err?.message || 'Realtime session connection error.');
          },
          onclose: (e: any) => {
            console.log('[GEMINI WS] CLOSED', { code: e?.code, reason: e?.reason });
            this.callbacks.onConnectionStateChange?.('closed');
            if (!this.isStopped) {
              this.stop();
            }
          }
        }
      });
    } catch (err: any) {
      console.error('[GeminiLiveSession] Start failed:', err);
      this.callbacks.onConnectionStateChange?.('error');
      this.callbacks.onError?.(err?.message || 'Failed to start Gemini Live voice session.');
      this.stop();
    }
  }

  private async startMicrophoneStream() {
    try {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });
      } catch (e) {
        // Fallback for browsers that reject specialized audio constraints
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (this.isStopped) return;

      const audioTracks = this.mediaStream?.getAudioTracks();
      const activeTrack = audioTracks && audioTracks.length > 0 ? audioTracks[0] : null;

      console.log('[MIC]', {
        exists: !!this.mediaStream,
        audioTrackCount: audioTracks?.length || 0,
        readyState: activeTrack?.readyState || null,
        enabled: activeTrack?.enabled ?? false,
        muted: activeTrack?.muted ?? false,
        settings: activeTrack?.getSettings() || {}
      });

      if (!activeTrack || activeTrack.readyState !== 'live') {
        throw new Error(`Microphone track unavailable or inactive (readyState: ${activeTrack?.readyState || 'none'})`);
      }

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
        this.ownsAudioContext = true;
        console.log('[AUDIO] context created');
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
        console.log('[AUDIO] context resumed');
      }

      console.log(`[AUDIO] AudioContext state: ${this.audioCtx.state}, sampleRate=${this.audioCtx.sampleRate}, baseLatency=${this.audioCtx.baseLatency || 0}`);

      // Load PCM AudioWorklet processor
      await this.loadPcmWorklet(this.audioCtx);

      if (this.isStopped) return;

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor');

      // Setup Web Audio API AnalyserNode for real-time microphone audio & pitch detection
      this.inputAnalyserNode = this.audioCtx.createAnalyser();
      this.inputAnalyserNode.fftSize = 512;
      this.inputAnalyserNode.smoothingTimeConstant = 0.15;
      this.sourceNode.connect(this.inputAnalyserNode);
      console.log('[AUDIO] input analyser connected');

      // DO NOT connect inputAnalyserNode or sourceNode to audioCtx.destination!
      // Microphone is strictly monitored for input analysis and capture, not output playback.

      let pcmLogTimer = 0;
      this.workletNode.port.onmessage = (event) => {
        if (this.isStopped || !this.session) return;
        const pcmArrayBuffer: ArrayBuffer = event.data;
        const int16 = new Int16Array(pcmArrayBuffer);

        let sum = 0;
        for (let i = 0; i < int16.length; i++) {
          sum += int16[i] * int16[i];
        }
        const pcmRms = Math.sqrt(sum / int16.length);

        const now = Date.now();
        if (process.env.NODE_ENV === 'development' && now - pcmLogTimer > 1000) {
          pcmLogTimer = now;
          console.log('[PCM CAPTURE]', {
            sampleCount: int16.length,
            firstSample: int16[0] || 0,
            pcmRms: pcmRms.toFixed(2),
            timestamp: now
          });
        }

        // Check barge-in: If AI is speaking and user input energy is high, stop AI playback
        if (this.audioPlayer?.getIsPlaying()) {
          if (pcmRms > 2000) {
            console.log('[AUDIO] User barge-in detected (PCM RMS > 2000), stopping playback.');
            this.audioPlayer.stop();
            this.callbacks.onStateChange?.('LISTENING');
          }
        }

        // Send realtime audio stream to Gemini Live when connection is ready
        if (this.isReady) {
          const base64Data = this.arrayBufferToBase64(pcmArrayBuffer);
          try {
            this.session.sendRealtimeInput({
              media: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Data
              }
            });

            if (process.env.NODE_ENV === 'development' && now - this.lastSendLogTimer > 1000) {
              this.lastSendLogTimer = now;
              console.log('[GEMINI SEND]', {
                type: 'audio_frame',
                bytes: base64Data.length,
                timestamp: now
              });
            }
          } catch (e) {
            // Ignore send errors during shutdown
          }
        }
      };

      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.audioCtx.destination);
    } catch (err: any) {
      console.error('[GeminiLiveSession] Mic stream start failed:', err);
      const errMsg = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
        ? 'Microphone permission denied. Please allow microphone access in your browser address bar settings.'
        : `Microphone error (${err?.name || 'Error'}): ${err?.message || 'Failed to capture audio stream'}`;
      this.callbacks.onError?.(errMsg);
      throw err;
    }
  }

  private handleServerMessage(msg: any) {
    if (this.isStopped) return;

    // Handle setupComplete
    if (msg.setupComplete) {
      console.log('[GEMINI RECV] setupComplete', msg.setupComplete);
      this.isReady = true;
      this.callbacks.onConnectionStateChange?.('ready');
      this.callbacks.onStateChange?.('LISTENING');
      return;
    }

    // Handle serverContent (Interrupted, modelTurn, turnComplete)
    if (msg.serverContent) {
      if (msg.serverContent.interrupted) {
        console.log('[GEMINI RECV] interrupted');
        this.audioPlayer?.stop();
        this.callbacks.onStateChange?.('LISTENING');
        return;
      }

      if (msg.serverContent.modelTurn?.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            const chunkBytes = part.inlineData.data.length;
            console.log('[GEMINI RECV] audio chunk', { bytes: chunkBytes });
            this.audioPlayer?.playChunk(part.inlineData.data);
          }
          if (part.text) {
            console.log('[GEMINI RECV] output transcript chunk:', part.text);
            this.currentAssistantText += part.text;
            this.callbacks.onAssistantTextChunk?.(part.text);
          }
        }
      }

      if (msg.serverContent.turnComplete) {
        console.log('[GEMINI RECV] turnComplete');
        if (this.currentAssistantText) {
          this.callbacks.onAssistantTextComplete?.(this.currentAssistantText);
          this.currentAssistantText = '';
        }
      }
    }

    // Handle Tool Calls (Function Calling)
    if (msg.toolCall?.functionCalls) {
      console.log('[GEMINI RECV] toolCall', msg.toolCall.functionCalls.map((f: any) => f.name));
      this.callbacks.onStateChange?.('THINKING');
      for (const call of msg.toolCall.functionCalls) {
        this.executeToolCall(call.name, call.args, call.id);
      }
    }

    // Handle Server Error
    if (msg.error) {
      console.error('[GEMINI RECV] error:', msg.error);
      const errMessage = typeof msg.error === 'string' 
        ? msg.error 
        : (msg.error.message || JSON.stringify(msg.error));
      this.callbacks.onError?.(`Gemini Live Error: ${errMessage}`);
      this.callbacks.onConnectionStateChange?.('error');
    }
  }

  private async executeToolCall(toolName: string, args: any, callId: string) {
    try {
      console.log(`[GeminiLiveSession] Executing tool: ${toolName}`, args);

      const res = await fetch('/api/ai/gemini-live-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName,
          args,
          pageContext: this.pageContext
        })
      });

      const data = await res.json();
      const toolResult = data.result || { success: false, message: 'Tool execution failed' };

      this.callbacks.onToolExecuted?.(toolName, toolResult);

      // Send tool response back to Gemini Live session
      if (this.session && !this.isStopped) {
        this.session.sendToolResponse({
          functionResponses: [
            {
              name: toolName,
              id: callId,
              response: { output: toolResult }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`[GeminiLiveSession] Tool execution error (${toolName}):`, err);
      if (this.session && !this.isStopped) {
        this.session.sendToolResponse({
          functionResponses: [
            {
              name: toolName,
              id: callId,
              response: { output: { success: false, error: 'Tool execution error' } }
            }
          ]
        });
      }
    }
  }

  public getInputAnalyserNode(): AnalyserNode | null {
    return this.inputAnalyserNode;
  }

  public getOutputAnalyserNode(): AnalyserNode | null {
    return this.audioPlayer?.getAnalyserNode() || null;
  }

  public getMicStreamState(): { exists: boolean; trackState: string | null; trackEnabled: boolean } {
    const audioTracks = this.mediaStream?.getAudioTracks();
    const track = audioTracks && audioTracks.length > 0 ? audioTracks[0] : null;
    return {
      exists: !!this.mediaStream,
      trackState: track?.readyState || null,
      trackEnabled: track?.enabled ?? false
    };
  }

  public getAudioContextState(): string {
    return this.audioCtx ? this.audioCtx.state : 'none';
  }

  public stop() {
    if (this.isStopped) return;
    this.isStopped = true;
    this.isReady = false;
    console.log('[AUDIO] session cleanup');

    // 1. Stop Audio Player immediately
    this.audioPlayer?.stop();
    this.audioPlayer?.close();
    this.audioPlayer = null;

    // 2. Disconnect & Close Media Stream & AudioWorklet & AnalyserNode
    if (this.inputAnalyserNode) {
      try {
        this.inputAnalyserNode.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.inputAnalyserNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.ownsAudioContext && this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }

    // 3. Close Gemini Live WebSocket Session
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        // Ignore
      }
      this.session = null;
    }

    this.callbacks.onConnectionStateChange?.('stopped');
    this.callbacks.onStateChange?.('STOPPED');
    this.callbacks.onClose?.();
  }

  private buildSystemPrompt(): string {
    const activeRoute = this.pageContext?.route || '/dashboard';
    const profileText = this.studentProfile ? JSON.stringify(this.studentProfile) : 'Student Profile Active';
    const pageCtxText = this.pageContext ? JSON.stringify(this.pageContext) : 'Standard Page Context';

    return `You are Smart Learn AI Assistant, a friendly, intelligent voice mentor for engineering and computer science students.
You talk naturally in English, Hindi, or Hinglish based on how the user speaks to you.
Be concise, helpful, clear, and direct in your audio responses. Do not produce long walls of text.

Active Page/Route: ${activeRoute}
Student Profile Data: ${profileText}
Current Page Context: ${pageCtxText}

You have access to tools for navigating screens (dashboard, DSA sheets, courses, profile, routine) and querying student data. When a user asks you to navigate or perform an action, use the tool!`;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async loadPcmWorklet(audioCtx: AudioContext) {
    const workletCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.inputSampleRate = sampleRate;
          this.targetSampleRate = 16000;
          this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
          this.targetChunkSize = 1024;
          this.outputBuffer = new Int16Array(this.targetChunkSize);
          this.outputIndex = 0;
        }

        process(inputs) {
          const input = inputs[0];
          if (!input || !input[0] || input[0].length === 0) return true;
          const inputChannel = input[0];
          const inputLength = inputChannel.length;
          let srcPos = 0;
          while (srcPos < inputLength) {
            let sample = 0;
            if (this.resampleRatio === 1) {
              sample = inputChannel[Math.floor(srcPos)];
              srcPos += 1;
            } else {
              const nextSrcPos = srcPos + this.resampleRatio;
              const iStart = Math.floor(srcPos);
              const iEnd = Math.min(Math.floor(nextSrcPos), inputLength - 1);
              let sum = 0;
              let count = 0;
              for (let i = iStart; i <= iEnd; i++) {
                sum += inputChannel[i];
                count++;
              }
              sample = count > 0 ? sum / count : inputChannel[iStart];
              srcPos = nextSrcPos;
            }
            const clamped = Math.max(-1, Math.min(1, sample));
            const pcmValue = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
            this.outputBuffer[this.outputIndex++] = pcmValue;
            if (this.outputIndex >= this.targetChunkSize) {
              const sendBuffer = this.outputBuffer.slice(0, this.targetChunkSize);
              this.port.postMessage(sendBuffer.buffer, [sendBuffer.buffer]);
              this.outputIndex = 0;
            }
          }
          return true;
        }
      }
      registerProcessor('pcm-processor', PCMProcessor);
    `;

    try {
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('[GeminiLiveSession] Inline Blob worklet failed, trying /pcm-processor.js', e);
      await audioCtx.audioWorklet.addModule('/pcm-processor.js');
    }
  }
}
