'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { askSmartAgentAction } from '../actions/agent';
import { useLivePageContext } from './LivePageContext';
import { 
  speakAssistantResponse, 
  stopAssistantSpeech, 
  isSpeechSynthesisSupported 
} from '@/lib/ai/speech-synthesizer';
import { 
  AudioSegmentRecorder, 
  transcribeAudioFile, 
  getSupportedMimeType,
  AudioRecorder 
} from '@/lib/ai/speech-recorder';

export interface SmartAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ label: string; url: string; isExternal?: boolean }>;
  requiresConfirmation?: {
    toolName: string;
    args: any;
    promptMessage: string;
  };
  toolExecuted?: string;
  timestamp?: string;
  navigationState?: 'RESOLVING' | 'NAVIGATING' | 'VERIFYING' | 'VERIFIED' | 'FAILED' | 'NOT_FOUND' | 'UNAUTHORIZED';
}

export interface ActiveContext {
  sheetId?: string;
  sheetTitle?: string;
  problemId?: string;
  problemTitle?: string;
  courseId?: string;
  courseTitle?: string;
}

export interface PendingVerification {
  navigationId: string;
  expectedRoute: string;
  expectedEntity?: {
    type: 'sheet' | 'problem' | 'course' | 'certificate';
    id: string;
    title?: string;
    number?: number;
  };
  successMessage: string;
  voiceTriggered?: boolean;
  timestamp: number;
}

export type AgentExecutionState = 
  | 'IDLE' 
  | 'UNDERSTANDING' 
  | 'EXECUTING' 
  | 'NAVIGATING' 
  | 'VERIFYING' 
  | 'SPEAKING' 
  | 'FAILED';

export type RealtimeVoiceState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'HEARING' 
  | 'FINALIZING' 
  | 'TRANSCRIBING' 
  | 'THINKING' 
  | 'SPEAKING_AI' 
  | 'STOPPED';

interface SmartAgentSessionContextValue {
  isOpen: boolean;
  toggleDrawer: () => void;
  openDrawer: (initialPrompt?: string) => void;
  closeDrawer: () => void;
  
  messages: SmartAgentMessage[];
  setMessages: React.Dispatch<React.SetStateAction<SmartAgentMessage[]>>;
  
  activeContext: ActiveContext;
  setActiveContext: React.Dispatch<React.SetStateAction<ActiveContext>>;
  
  executionState: AgentExecutionState;
  realtimeVoiceState: RealtimeVoiceState;
  inputVal: string;
  setInputVal: (val: string) => void;
  
  isLoading: boolean;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  isTranscribing: boolean;
  setIsTranscribing: (val: boolean) => void;
  isSpeaking: boolean;
  isVoiceMode: boolean;
  setIsVoiceMode: (val: boolean) => void;
  voiceNotice: string | null;
  setVoiceNotice: (val: string | null) => void;
  
  handleSendPrompt: (textToSend?: string, confirmedTool?: { toolName: string; args: any }, isVoiceTrigger?: boolean) => Promise<void>;
  stopSpeech: () => void;
  stopVoiceSession: () => void;
  startVoiceListening: () => Promise<void>;
  stopVoiceRecordingAndSend: () => Promise<void>;
  toggleVoiceRecording: () => Promise<void>;
  clearConversation: () => void;
  getDynamicLoadingText: () => string;
}

const SmartAgentSessionContext = createContext<SmartAgentSessionContextValue | undefined>(undefined);

export function SmartAgentSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { liveContext } = useLivePageContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [currentPromptText, setCurrentPromptText] = useState('');

  const [messages, setMessages] = useState<SmartAgentMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm **Smart Learn AI Agent** ✦\n\nI can execute actions, open courses, launch DSA sheets, search YouTube/GPT, open LaTeX editor, and manage your routine or goals using natural language or voice commands.\n\nTry speaking to me!`,
      actions: [
        { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
        { label: 'Explore Courses', url: '/courses' }
      ]
    }
  ]);

  const [activeContext, setActiveContext] = useState<ActiveContext>({});
  const [executionState, setExecutionState] = useState<AgentExecutionState>('IDLE');
  const [realtimeVoiceState, setRealtimeVoiceState] = useState<RealtimeVoiceState>('IDLE');

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  // ─── STATE REFS FOR ASYNC CALLBACK & SESSION VALIDATION ───
  const isProcessingRef = useRef<boolean>(false);
  const segmentRecorderRef = useRef<AudioSegmentRecorder | null>(null);
  const voiceStateRef = useRef<RealtimeVoiceState>('IDLE');
  const voiceSessionIdRef = useRef<number>(0);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sttAbortControllerRef = useRef<AbortController | null>(null);
  const agentAbortControllerRef = useRef<AbortController | null>(null);

  // VAD Monitoring Loop Refs
  const vadAnimFrameRef = useRef<number | null>(null);
  const ambientSamplesRef = useRef<number[]>([]);
  const speechStartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bargeInTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isVoiceModeRef = useRef<boolean>(isVoiceMode);
  const isOpenRef = useRef<boolean>(isOpen);

  // Synchronize state refs
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      stopVoiceSession();
    }
  }, [isOpen]);

  // Update voice state ref helper
  const setVoiceState = (nextState: RealtimeVoiceState) => {
    voiceStateRef.current = nextState;
    setRealtimeVoiceState(nextState);

    // Sync boolean flags for backward compatibility
    setIsListening(nextState === 'LISTENING' || nextState === 'HEARING' || nextState === 'FINALIZING');
    setIsTranscribing(nextState === 'TRANSCRIBING');
    setIsSpeaking(nextState === 'SPEAKING_AI');
  };

  // Clean up recording, VAD timers, and speech on Provider unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  // Helper to clear pending restart timer explicitly
  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const clearVADTimers = () => {
    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current);
      speechStartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (bargeInTimerRef.current) {
      clearTimeout(bargeInTimerRef.current);
      bargeInTimerRef.current = null;
    }
    if (vadAnimFrameRef.current !== null) {
      cancelAnimationFrame(vadAnimFrameRef.current);
      vadAnimFrameRef.current = null;
    }
  };

  // ─── VOICE SESSION CONTROLLER FUNCTIONS ───

  const stopSpeech = () => {
    clearRestartTimeout();
    stopAssistantSpeech();
    if (voiceStateRef.current === 'SPEAKING_AI') {
      setVoiceState('IDLE');
    }
  };

  const stopVoiceSession = () => {
    clearRestartTimeout();
    clearVADTimers();

    // Abort pending STT and Agent network requests
    if (sttAbortControllerRef.current) {
      try { sttAbortControllerRef.current.abort(); } catch (e) {}
      sttAbortControllerRef.current = null;
    }
    if (agentAbortControllerRef.current) {
      try { agentAbortControllerRef.current.abort(); } catch (e) {}
      agentAbortControllerRef.current = null;
    }

    // Invalidate session ID to block all pending async callbacks / TTS loops
    voiceSessionIdRef.current++;

    // Stop TTS speech playback
    stopAssistantSpeech();

    // Dispose persistent segment recorder and MediaStream tracks
    if (segmentRecorderRef.current) {
      try {
        segmentRecorderRef.current.dispose();
      } catch (e) {}
      segmentRecorderRef.current = null;
    }

    ambientSamplesRef.current = [];
    setVoiceState('STOPPED');
  };

  // ─── REAL-TIME VAD LOOP ENGINE ───
  const startVADLoop = () => {
    clearVADTimers();

    const loop = () => {
      if (!isOpenRef.current || !isVoiceModeRef.current || !segmentRecorderRef.current || !segmentRecorderRef.current.analyzer) {
        return;
      }

      const analyzer = segmentRecorderRef.current.analyzer;
      const rms = analyzer.getRMS();

      // Ambient Noise Calibration Phase (First 15 samples)
      if (ambientSamplesRef.current.length < 15) {
        ambientSamplesRef.current.push(rms);
        analyzer.calibrate(ambientSamplesRef.current);
      }

      const state = voiceStateRef.current;

      // STATE 1: LISTENING (Waiting for speech entry)
      if (state === 'LISTENING') {
        if (rms > analyzer.speechThreshold) {
          if (!speechStartTimerRef.current) {
            speechStartTimerRef.current = setTimeout(() => {
              speechStartTimerRef.current = null;
              if (voiceStateRef.current === 'LISTENING' && isOpenRef.current && isVoiceModeRef.current) {
                // Speech confirmed! Start segment recording
                setVoiceState('HEARING');
                if (segmentRecorderRef.current) {
                  segmentRecorderRef.current.startSegmentRecording();
                }
              }
            }, 150); // 150ms speech start stability window
          }
        } else {
          if (speechStartTimerRef.current) {
            clearTimeout(speechStartTimerRef.current);
            speechStartTimerRef.current = null;
          }
        }
      }

      // STATE 2: HEARING (Capturing user speech turn)
      else if (state === 'HEARING') {
        if (rms < analyzer.silenceThreshold) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (voiceStateRef.current === 'HEARING' && isOpenRef.current && isVoiceModeRef.current) {
                // Silence window confirmed (750ms)! Finalize segment & process STT
                setVoiceState('FINALIZING');
                processSpeechSegment();
              }
            }, 750); // 750ms silence window (600-900ms range)
          }
        } else {
          // Reset silence timer if user continues speaking
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      }

      // STATE 3: SPEAKING_AI (Barge-In Interruption Monitoring)
      else if (state === 'SPEAKING_AI') {
        // Monitor for high energy user speech exceeding bargeInThreshold
        if (rms > analyzer.bargeInThreshold) {
          if (!bargeInTimerRef.current) {
            bargeInTimerRef.current = setTimeout(() => {
              bargeInTimerRef.current = null;
              if (voiceStateRef.current === 'SPEAKING_AI' && isOpenRef.current && isVoiceModeRef.current) {
                // BARGE-IN DETECTED!
                if (process.env.NODE_ENV === 'development') {
                  console.log('[VAD BARGE-IN DETECTED] User interrupted AI speech!');
                }
                // Stop speech and abort active agent network requests immediately
                stopSpeech();
                if (agentAbortControllerRef.current) {
                  try { agentAbortControllerRef.current.abort(); } catch (e) {}
                  agentAbortControllerRef.current = null;
                }
                // Transition state to HEARING to capture user's new command
                setVoiceState('HEARING');
                if (segmentRecorderRef.current) {
                  segmentRecorderRef.current.startSegmentRecording();
                }
              }
            }, 200); // 200ms barge-in confirmation window
          }
        } else {
          if (bargeInTimerRef.current) {
            clearTimeout(bargeInTimerRef.current);
            bargeInTimerRef.current = null;
          }
        }
      }

      vadAnimFrameRef.current = requestAnimationFrame(loop);
    };

    vadAnimFrameRef.current = requestAnimationFrame(loop);
  };

  const startVoiceListening = async () => {
    clearRestartTimeout();
    if (isLoading) return;

    stopSpeech();
    setVoiceNotice(null);

    const currentSessionId = ++voiceSessionIdRef.current;

    if (!segmentRecorderRef.current) {
      segmentRecorderRef.current = new AudioSegmentRecorder();
    }

    const res = await segmentRecorderRef.current.acquirePersistentStream();

    if (voiceSessionIdRef.current !== currentSessionId || !isOpenRef.current || !isVoiceModeRef.current) {
      if (segmentRecorderRef.current) segmentRecorderRef.current.dispose();
      segmentRecorderRef.current = null;
      setVoiceState('STOPPED');
      return;
    }

    if (!res.success) {
      if (segmentRecorderRef.current) segmentRecorderRef.current.dispose();
      segmentRecorderRef.current = null;
      setVoiceState('STOPPED');
      setVoiceNotice(res.message || 'Microphone access error.');
      return;
    }

    setVoiceState('LISTENING');
    startVADLoop();
  };

  // ─── PROCESS FINALIZED SPEECH SEGMENT ───
  const processSpeechSegment = async () => {
    if (!segmentRecorderRef.current) return;
    const currentSessionId = voiceSessionIdRef.current;

    setVoiceState('TRANSCRIBING');

    try {
      const blob = await segmentRecorderRef.current.stopSegmentRecording();

      if (voiceSessionIdRef.current !== currentSessionId || !isOpenRef.current) {
        setVoiceState('LISTENING');
        return;
      }

      // Ignore silent / empty audio blobs (under 300 bytes)
      if (!blob || blob.size < 300) {
        setVoiceState('LISTENING');
        startVADLoop();
        return;
      }

      // Create STT AbortController
      sttAbortControllerRef.current = new AbortController();

      const sttRes = await transcribeAudioFile(
        blob, 
        getSupportedMimeType(), 
        sttAbortControllerRef.current.signal
      );

      sttAbortControllerRef.current = null;

      if (voiceSessionIdRef.current !== currentSessionId || !isOpenRef.current) {
        setVoiceState('LISTENING');
        return;
      }

      if (sttRes.success && sttRes.transcript) {
        setVoiceState('THINKING');
        setInputVal(sttRes.transcript);
        await handleSendPrompt(sttRes.transcript, undefined, true);
      } else {
        if (sttRes.errorCode !== 'TRANSCRIPTION_FAILED') {
          setVoiceNotice(sttRes.message || 'Could not understand speech.');
        }
        setVoiceState('LISTENING');
        startVADLoop();
      }
    } catch (err: any) {
      sttAbortControllerRef.current = null;
      if (voiceSessionIdRef.current === currentSessionId && isOpenRef.current) {
        setVoiceState('LISTENING');
        startVADLoop();
      }
    }
  };

  const stopVoiceRecordingAndSend = async () => {
    if (voiceStateRef.current === 'HEARING') {
      setVoiceState('FINALIZING');
      await processSpeechSegment();
    }
  };

  const toggleVoiceRecording = async () => {
    clearRestartTimeout();
    if (isLoading) return;

    if (realtimeVoiceState === 'STOPPED' || realtimeVoiceState === 'IDLE') {
      await startVoiceListening();
    } else {
      stopVoiceSession();
    }
  };

  const toggleDrawer = () => setIsOpen(prev => !prev);
  
  const openDrawer = (initialPrompt?: string) => {
    setIsOpen(true);
    if (initialPrompt && initialPrompt.trim()) {
      handleSendPrompt(initialPrompt);
    }
  };

  const closeDrawer = () => {
    stopVoiceSession();
    setIsOpen(false);
  };

  const clearConversation = () => {
    stopVoiceSession();
    setMessages([
      {
        role: 'assistant',
        content: `Conversation restarted. How can I help you in Smart Learn today?`,
        actions: [
          { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
          { label: 'Explore Courses', url: '/courses' }
        ]
      }
    ]);
    setActiveContext({});
    setExecutionState('IDLE');
  };

  const handleSetVoiceMode = (val: boolean) => {
    setIsVoiceMode(val);
    if (!val) {
      stopVoiceSession();
    } else {
      startVoiceListening();
    }
  };

  const getDynamicLoadingText = () => {
    if (executionState === 'UNDERSTANDING') return 'Understanding intent...';
    if (executionState === 'EXECUTING') return 'Executing tool...';
    if (executionState === 'NAVIGATING') return 'Opening page...';
    if (executionState === 'VERIFYING') return 'Verifying destination page...';

    const t = currentPromptText.toLowerCase();
    if (t.includes('search') || t.includes('youtube') || t.includes('yt') || t.includes('gpt')) {
      return 'Searching Smart Learn & External Sources...';
    }
    if (t.includes('open') || t.includes('kholo') || t.includes('dsa') || t.includes('course') || t.includes('problem')) {
      return 'Opening page...';
    }
    return 'Processing your command...';
  };

  // Helper function to trigger speech with continuous conversation loop
  const triggerSpeechWithLoop = (text: string, voiceTriggered = false) => {
    clearRestartTimeout();

    if (!isVoiceModeRef.current && !voiceTriggered) {
      setExecutionState('IDLE');
      setVoiceState('LISTENING');
      startVADLoop();
      return;
    }

    const promptSessionId = voiceSessionIdRef.current;
    setExecutionState('SPEAKING');
    setVoiceState('SPEAKING_AI');

    const spoke = speakAssistantResponse(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        clearRestartTimeout();

        // CONTINUOUS VOICE AGENT LOOP: Automatically transition back to LISTENING
        if (
          voiceSessionIdRef.current === promptSessionId &&
          isVoiceModeRef.current &&
          isOpenRef.current
        ) {
          setExecutionState('IDLE');
          setVoiceState('LISTENING');
          startVADLoop();
        } else {
          setExecutionState('IDLE');
          setVoiceState('STOPPED');
        }
      },
      onError: () => {
        setIsSpeaking(false);
        clearRestartTimeout();
        setExecutionState('IDLE');
        setVoiceState('LISTENING');
        startVADLoop();
      }
    });

    if (!spoke && !isSpeechSynthesisSupported()) {
      setVoiceNotice('Response is ready, but voice playback is unavailable on this browser.');
      setExecutionState('IDLE');
      setVoiceState('LISTENING');
      startVADLoop();
    }
  };

  // ─── POST-NAVIGATION HANDSHAKE VERIFICATION EFFECT ───
  useEffect(() => {
    if (!pendingVerification) return;

    const { navigationId, expectedRoute, expectedEntity, successMessage, voiceTriggered, timestamp } = pendingVerification;

    // Timeout safety check (8s)
    const timeoutTimer = setTimeout(() => {
      if (pendingVerification) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SMART AGENT DEBUG - VERIFICATION TIMEOUT]', {
            navigationId,
            expectedRoute,
            timeElapsedMs: Date.now() - timestamp
          });
        }
        setPendingVerification(null);
        setExecutionState('FAILED');
        const failMsg = `Requested page navigation verification timed out. Please check your connection.`;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: failMsg,
          navigationState: 'FAILED',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        triggerSpeechWithLoop(failMsg, voiceTriggered);
      }
    }, 8000);

    // Read liveContext for verification update
    if (liveContext) {
      const loadState = liveContext.loadState || 'ready';
      const actualRoute = liveContext.route;
      const actualEntity = liveContext.currentEntity;

      // Case A: 404 / Not Found
      if (loadState === 'not-found') {
        clearTimeout(timeoutTimer);
        setPendingVerification(null);
        setExecutionState('FAILED');
        const notFoundText = expectedEntity?.title 
          ? `"${expectedEntity.title}" page nahi mila.` 
          : `Ye page nahi mila.`;
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: notFoundText,
          navigationState: 'NOT_FOUND',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        triggerSpeechWithLoop(notFoundText, voiceTriggered);
        return;
      }

      // Case B: Error or Unauthorized
      if (loadState === 'error' || loadState === 'unauthorized') {
        clearTimeout(timeoutTimer);
        setPendingVerification(null);
        setExecutionState('FAILED');
        const errText = loadState === 'unauthorized'
          ? `Aapko is page ka access nahi hai.`
          : `Page load karne me problem aayi.`;

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: errText,
          navigationState: loadState === 'unauthorized' ? 'UNAUTHORIZED' : 'FAILED',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        triggerSpeechWithLoop(errText, voiceTriggered);
        return;
      }

      // Case C: Page is Ready! Perform Target Entity Comparison
      if (loadState === 'ready') {
        if (expectedEntity) {
          const typeMatches = actualEntity?.type === expectedEntity.type;
          const idMatches = actualEntity?.id === expectedEntity.id;
          const titleMatches = actualEntity?.title && expectedEntity.title
            ? actualEntity.title.toLowerCase().includes(expectedEntity.title.toLowerCase()) || expectedEntity.title.toLowerCase().includes(actualEntity.title.toLowerCase())
            : false;

          if (typeMatches && (idMatches || titleMatches)) {
            clearTimeout(timeoutTimer);
            setPendingVerification(null);

            if (expectedEntity.type === 'sheet') {
              setActiveContext(prev => ({
                ...prev,
                sheetId: actualEntity?.id || expectedEntity.id,
                sheetTitle: actualEntity?.title || expectedEntity.title
              }));
            } else if (expectedEntity.type === 'problem') {
              setActiveContext(prev => ({
                ...prev,
                problemId: actualEntity?.id || expectedEntity.id,
                problemTitle: actualEntity?.title || expectedEntity.title
              }));
            } else if (expectedEntity.type === 'course') {
              setActiveContext(prev => ({
                ...prev,
                courseId: actualEntity?.id || expectedEntity.id,
                courseTitle: actualEntity?.title || expectedEntity.title
              }));
            }

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: successMessage,
              navigationState: 'VERIFIED',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            triggerSpeechWithLoop(successMessage, voiceTriggered);
            return;
          } else {
            clearTimeout(timeoutTimer);
            setPendingVerification(null);
            setExecutionState('FAILED');
            const mismatchText = `Requested ${expectedEntity.type} open nahi ho paayi.`;
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: mismatchText,
              navigationState: 'FAILED',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            triggerSpeechWithLoop(mismatchText, voiceTriggered);
            return;
          }
        } else {
          clearTimeout(timeoutTimer);
          setPendingVerification(null);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: successMessage,
            navigationState: 'VERIFIED',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);

          triggerSpeechWithLoop(successMessage, voiceTriggered);
        }
      }
    }

    return () => clearTimeout(timeoutTimer);
  }, [liveContext, pendingVerification, isVoiceMode]);

  // ─── PROMPT SUBMISSION HANDLER ───
  const handleSendPrompt = async (
    textToSend?: string, 
    confirmedTool?: { toolName: string; args: any }, 
    isVoiceTrigger = false
  ) => {
    const promptText = (textToSend || inputVal).trim();
    if ((!promptText && !confirmedTool) || isLoading || isProcessingRef.current) return;

    isProcessingRef.current = true;
    stopSpeech();

    setCurrentPromptText(promptText);

    if (!confirmedTool) {
      const userMsg: SmartAgentMessage = {
        role: 'user',
        content: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
      setInputVal('');
    }

    setIsLoading(true);
    setExecutionState('UNDERSTANDING');
    setVoiceState('THINKING');

    // Create Agent AbortController
    agentAbortControllerRef.current = new AbortController();

    try {
      const historyForAction = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      setExecutionState('EXECUTING');

      const res = await askSmartAgentAction({
        prompt: promptText || 'Execute confirmed tool',
        history: historyForAction,
        pageContext: {
          route: pathname,
          ...activeContext,
          liveContext
        },
        confirmedTool
      });

      agentAbortControllerRef.current = null;

      // Check if navigation handshake is required
      if (res.success && res.pendingNavigation && res.expectedRoute) {
        setExecutionState('NAVIGATING');

        const navId = res.navigationId || `nav_${Date.now()}`;
        const targetUrl = res.actions?.[0]?.url || res.expectedRoute;
        const succMsg = res.successMessage || res.message;

        setPendingVerification({
          navigationId: navId,
          expectedRoute: res.expectedRoute,
          expectedEntity: res.expectedEntity,
          successMessage: succMsg,
          voiceTriggered: isVoiceTrigger,
          timestamp: Date.now()
        });

        if (targetUrl && targetUrl !== pathname) {
          router.push(targetUrl);
        } else {
          setExecutionState('VERIFYING');
        }
      } else {
        setExecutionState('VERIFYING');

        if (res.message) {
          const assistantMsg: SmartAgentMessage = {
            role: 'assistant',
            content: res.message,
            actions: res.actions,
            requiresConfirmation: res.requiresConfirmation,
            toolExecuted: res.toolExecuted,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMsg]);

          if (res.success && res.actions && res.actions.length > 0) {
            const actionUrl = res.actions[0].url || '';
            const probMatch = actionUrl.match(/\/code-arena\/problems\/([^\/]+)/);
            const courseMatch = actionUrl.match(/\/courses\/([^\/]+)/);

            if (probMatch) {
              setActiveContext(prev => ({
                ...prev,
                problemId: probMatch[1]
              }));
            } else if (courseMatch) {
              setActiveContext(prev => ({
                ...prev,
                courseId: courseMatch[1]
              }));
            }
          }

          triggerSpeechWithLoop(res.message, isVoiceTrigger);
        }
      }
    } catch (err: any) {
      agentAbortControllerRef.current = null;
      setExecutionState('IDLE');
      if (err.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'An error occurred while executing the command. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <SmartAgentSessionContext.Provider
      value={{
        isOpen,
        toggleDrawer,
        openDrawer,
        closeDrawer,
        messages,
        setMessages,
        activeContext,
        setActiveContext,
        executionState,
        realtimeVoiceState,
        inputVal,
        setInputVal,
        isLoading,
        isListening,
        setIsListening,
        isTranscribing,
        setIsTranscribing,
        isSpeaking,
        isVoiceMode,
        setIsVoiceMode: handleSetVoiceMode,
        voiceNotice,
        setVoiceNotice,
        handleSendPrompt,
        stopSpeech,
        stopVoiceSession,
        startVoiceListening,
        stopVoiceRecordingAndSend,
        toggleVoiceRecording,
        clearConversation,
        getDynamicLoadingText
      }}
    >
      {children}
    </SmartAgentSessionContext.Provider>
  );
}

export function useSmartAgentSession() {
  const ctx = useContext(SmartAgentSessionContext);
  if (!ctx) {
    throw new Error('useSmartAgentSession must be used within a SmartAgentSessionProvider');
  }
  return ctx;
}
