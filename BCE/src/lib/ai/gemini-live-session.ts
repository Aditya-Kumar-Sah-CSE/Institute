import { GoogleGenAI, Modality } from '@google/genai';
import { GEMINI_TOOL_DECLARATIONS } from './agent-tool-declarations';
import { GeminiAudioPlayer } from './gemini-audio-player';

export interface GeminiLiveSessionCallbacks {
  onStateChange?: (state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING_AI' | 'STOPPED') => void;
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
  private isStopped: boolean = false;
  private currentAssistantText: string = '';
  private callbacks: GeminiLiveSessionCallbacks;
  private pageContext: any;
  private studentProfile: any;

  constructor(
    callbacks: GeminiLiveSessionCallbacks = {},
    pageContext?: any,
    studentProfile?: any
  ) {
    this.callbacks = callbacks;
    this.pageContext = pageContext;
    this.studentProfile = studentProfile;
  }

  public async start() {
    try {
      this.isStopped = false;
      this.callbacks.onStateChange?.('THINKING');

      // 1. Fetch ephemeral token from server
      const tokenRes = await fetch('/api/ai/gemini-live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.message || 'Failed to initialize Gemini Live session token.');
      }

      if (this.isStopped) return;

      // 2. Initialize Audio Player
      this.audioPlayer = new GeminiAudioPlayer({
        onPlaybackStart: () => {
          if (!this.isStopped) this.callbacks.onStateChange?.('SPEAKING_AI');
        },
        onPlaybackEnd: () => {
          if (!this.isStopped) this.callbacks.onStateChange?.('LISTENING');
        }
      });

      // 3. Format Tools Declarations from Client-Safe Schema
      const toolsDeclarations = GEMINI_TOOL_DECLARATIONS;

      // 4. Build System Instruction
      const systemInstructionText = this.buildSystemPrompt();

      // 5. Connect to Gemini Live
      const clientAi = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: { apiVersion: 'v1alpha' }
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
            console.log('[GeminiLiveSession] WebSocket connection established.');
            if (!this.isStopped) {
              this.callbacks.onStateChange?.('LISTENING');
              this.startMicrophoneStream();
            }
          },
          onmessage: (msg: any) => {
            this.handleServerMessage(msg);
          },
          onerror: (err: any) => {
            console.error('[GeminiLiveSession] Error:', err);
            this.callbacks.onError?.(err?.message || 'Realtime session connection error.');
          },
          onclose: () => {
            console.log('[GeminiLiveSession] WebSocket closed.');
            if (!this.isStopped) {
              this.stop();
            }
          }
        }
      });
    } catch (err: any) {
      console.error('[GeminiLiveSession] Start failed:', err);
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
            autoGainControl: true
          }
        });
      } catch (e) {
        // Fallback for browsers that reject specialized audio constraints
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (this.isStopped) return;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Load PCM AudioWorklet processor (inline Blob with static fallback)
      await this.loadPcmWorklet(this.audioCtx);

      if (this.isStopped) return;

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-processor');

      this.workletNode.port.onmessage = (event) => {
        if (this.isStopped || !this.session) return;
        const pcmArrayBuffer: ArrayBuffer = event.data;
        const base64Data = this.arrayBufferToBase64(pcmArrayBuffer);

        // Check barge-in: If AI is speaking and user input energy is high, stop AI playback
        if (this.audioPlayer?.getIsPlaying()) {
          const isUserSpeaking = this.detectUserAudioEnergy(pcmArrayBuffer);
          if (isUserSpeaking) {
            this.audioPlayer.stop();
            this.callbacks.onStateChange?.('LISTENING');
          }
        }

        // Send realtime audio stream to Gemini Live
        try {
          this.session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        } catch (e) {
          // Ignore send errors during shutdown
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
    }
  }

  private handleServerMessage(msg: any) {
    if (this.isStopped) return;

    // Handle Interrupted signal (Server detected barge-in)
    if (msg.serverContent?.interrupted) {
      console.log('[GeminiLiveSession] AI response interrupted by user (barge-in).');
      this.audioPlayer?.stop();
      this.callbacks.onStateChange?.('LISTENING');
      return;
    }

    // Handle Model Turn content (Audio & Text)
    if (msg.serverContent?.modelTurn?.parts) {
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          // Send 24kHz PCM audio chunk to audio player
          this.audioPlayer?.playChunk(part.inlineData.data);
        }
        if (part.text) {
          this.currentAssistantText += part.text;
          this.callbacks.onAssistantTextChunk?.(part.text);
        }
      }
    }

    // Handle Turn Complete
    if (msg.serverContent?.turnComplete) {
      if (this.currentAssistantText) {
        this.callbacks.onAssistantTextComplete?.(this.currentAssistantText);
        this.currentAssistantText = '';
      }
    }

    // Handle Tool Calls (Function Calling)
    if (msg.toolCall?.functionCalls) {
      this.callbacks.onStateChange?.('THINKING');
      for (const call of msg.toolCall.functionCalls) {
        this.executeToolCall(call.name, call.args, call.id);
      }
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

  private detectUserAudioEnergy(pcmArrayBuffer: ArrayBuffer): boolean {
    const int16 = new Int16Array(pcmArrayBuffer);
    let sum = 0;
    for (let i = 0; i < int16.length; i++) {
      sum += Math.abs(int16[i]);
    }
    const avgEnergy = sum / int16.length;
    return avgEnergy > 2000;
  }

  public stop() {
    if (this.isStopped) return;
    this.isStopped = true;

    // 1. Stop Audio Player immediately
    this.audioPlayer?.stop();
    this.audioPlayer?.close();
    this.audioPlayer = null;

    // 2. Disconnect & Close Media Stream & AudioWorklet
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
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
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
