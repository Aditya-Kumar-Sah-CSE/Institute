'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { askSmartAgentAction } from '../actions/agent';
import { useLivePageContext } from './LivePageContext';
import { GeminiLiveSession, VoiceConnectionState } from '@/lib/ai/gemini-live-session';
import { AgentSessionState } from '@/lib/ai/agent-controller';
import { 
  speakAssistantResponse, 
  stopAssistantSpeech, 
  isSpeechSynthesisSupported,
  getSpeechSynthesisSpeaking
} from '@/lib/ai/speech-synthesizer';
import { resolveClientFastPath } from '@/lib/ai/client-fast-path';
import { LatencyTracker } from '@/lib/ai/latency-telemetry';
import { 
  loadAgentMemory, 
  saveAgentMemory, 
  clearAgentMemory, 
  SUMMARY_TRIGGER_MESSAGES 
} from '@/lib/ai/agent-memory';

export interface AudioDiagnostics {
  audioContextState: string;
  connectionState: VoiceConnectionState;
  micAvailable: boolean;
  micTrackState: string | null;
  micTrackEnabled: boolean;
  inputRms: number;
  inputDb: number;
  outputRms: number;
  outputDb: number;
  inputSamplesActive: boolean;
  outputSamplesActive: boolean;
  agentPlaybackActive: boolean;
  outputSource: 'gemini_pcm' | 'web_speech' | 'none';
  silentReason: 
    | 'VOICE_STARTING'
    | 'VOICE_CONNECTING'
    | 'VOICE_ERROR'
    | 'NO_MIC_STREAM'
    | 'MIC_TRACK_NOT_LIVE'
    | 'MIC_TRACK_DISABLED'
    | 'AUDIO_CONTEXT_SUSPENDED'
    | 'NO_INPUT_SIGNAL'
    | 'NO_AGENT_PLAYBACK'
    | 'NO_OUTPUT_SIGNAL'
    | 'AWAITING_SPEECH'
    | 'PLAYBACK_IDLE'
    | null;
}

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
  retried?: boolean;
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
  connectionState: VoiceConnectionState;
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
  interimTranscript: string;
  voiceNotice: string | null;
  setVoiceNotice: (val: string | null) => void;
  
  handleSendPrompt: (textToSend?: string, confirmedTool?: { toolName: string; args: any }, isVoiceTrigger?: boolean) => Promise<void>;
  stopSpeech: () => void;
  stopVoiceSession: () => void;
  startVoiceListening: () => Promise<void>;
  stopVoiceRecordingAndSend: () => Promise<void>;
  toggleVoiceRecording: () => Promise<void>;
  memorySummary: string | null;
  clearMemory: () => void;
  clearConversation: () => void;
  getDynamicLoadingText: () => string;
  getInputAnalyserNode: () => AnalyserNode | null;
  getOutputAnalyserNode: () => AnalyserNode | null;
  getAudioDiagnostics: () => AudioDiagnostics;
}

const SmartAgentSessionContext = createContext<SmartAgentSessionContextValue | undefined>(undefined);

export function SmartAgentSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { liveContext, executeDOMActionOnPage } = useLivePageContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [currentPromptText, setCurrentPromptText] = useState('');

  const [messages, setMessages] = useState<SmartAgentMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm **Smart Learn AI Agent** ✦\n\nYour continuous learning mentor. Powered by real-time voice, live page awareness, and instant verification!\n\nClick the mic button once to talk hands-free continuously.`,
      actions: [
        { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
        { label: 'Explore Courses', url: '/courses' }
      ]
    }
  ]);

  const [activeContext, setActiveContext] = useState<ActiveContext>({});
  const [executionState, setExecutionState] = useState<AgentExecutionState>('IDLE');
  const [realtimeVoiceState, setRealtimeVoiceState] = useState<RealtimeVoiceState>('IDLE');
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('stopped');

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [memorySummary, setMemorySummary] = useState<string | null>(null);

  // Load previous rolling memory summary on session startup
  useEffect(() => {
    const mem = loadAgentMemory();
    if (mem && mem.summary) {
      setMemorySummary(mem.summary);
      const shortSummary = mem.summary.length > 180 ? `${mem.summary.slice(0, 180)}...` : mem.summary;
      setMessages([
        {
          role: 'assistant',
          content: `Welcome back to **Smart Learn AI Agent** ✦\n\nI remember our previous conversation:\n_"${shortSummary}"_\n\nHow would you like to continue today?`,
          actions: [
            { label: 'Continue Practice', url: '/code-arena/sheets' },
            { label: 'View Dashboard', url: '/dashboard' }
          ]
        }
      ]);
    }
  }, []);

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  // Single Authoritative Agent Session State Ref
  const agentSessionStateRef = useRef<AgentSessionState>({
    route: pathname || '/dashboard'
  });

  // Request Cancellation AbortController Ref & User Role Cache Ref
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const userRoleRef = useRef<string>('student');

  // Gemini Live Session Ref & AudioContext / SpeechRecognition / Session Counter Refs
  const geminiLiveSessionRef = useRef<GeminiLiveSession | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voiceSessionIdRef = useRef<number>(0);
  const voiceStateRef = useRef<RealtimeVoiceState>('IDLE');
  const isVoiceModeRef = useRef<boolean>(isVoiceMode);
  const isOpenRef = useRef<boolean>(isOpen);

  // Synchronize active session state with live application context & pathname
  useEffect(() => {
    if (pathname) {
      agentSessionStateRef.current.route = pathname;
      let panel: 'student' | 'instructor' | 'admin' | 'developer' = 'student';
      if (pathname.startsWith('/instructor')) panel = 'instructor';
      else if (pathname.startsWith('/admin')) panel = 'admin';
      else if (pathname.startsWith('/developer') || pathname.startsWith('/super-admin')) panel = 'developer';
      agentSessionStateRef.current.currentPanel = panel;
    }
    if (liveContext?.currentEntity) {
      const entity = liveContext.currentEntity;
      if (entity.type === 'sheet') {
        agentSessionStateRef.current.sheetId = entity.id;
        agentSessionStateRef.current.sheetTitle = entity.title;
      } else if (entity.type === 'problem') {
        agentSessionStateRef.current.problemId = entity.id;
        agentSessionStateRef.current.problemTitle = entity.title;
        if (entity.metadata?.number) {
          agentSessionStateRef.current.problemNumber = entity.metadata.number;
        }
      } else if (entity.type === 'course') {
        agentSessionStateRef.current.courseId = entity.id;
        agentSessionStateRef.current.courseTitle = entity.title;
      }
    }
  }, [pathname, liveContext]);

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

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('toggleSmartAgentDrawer', handleToggle);
    window.addEventListener('openSmartAgentDrawer', handleOpen);
    return () => {
      window.removeEventListener('toggleSmartAgentDrawer', handleToggle);
      window.removeEventListener('openSmartAgentDrawer', handleOpen);
    };
  }, []);

  // Update voice state helper
  const setVoiceState = (nextState: RealtimeVoiceState) => {
    voiceStateRef.current = nextState;
    setRealtimeVoiceState(nextState);

    setIsListening(nextState === 'LISTENING' || nextState === 'HEARING' || nextState === 'FINALIZING');
    setIsTranscribing(nextState === 'TRANSCRIBING');
    setIsSpeaking(nextState === 'SPEAKING_AI');
  };

  // ─── REAL NAVIGATION & VERIFICATION HELPERS ───
  const performRealNavigation = useCallback(async (targetRoute: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const startPath = window.location.pathname + window.location.search;
    if (startPath === targetRoute) return true;

    console.log(`[SmartAgent] Executing navigation to: ${targetRoute}`);

    // 1. Try Next.js App Router push
    try {
      router.push(targetRoute);
    } catch (e) {
      console.warn('[SmartAgent] router.push threw error:', e);
    }

    // 2. Fast Event-Driven Polling (30ms interval up to 210ms max)
    for (let i = 0; i < 7; i++) {
      await new Promise(r => setTimeout(r, 30));
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath === targetRoute || currentPath.startsWith(targetRoute)) {
        return true;
      }
    }

    // 3. Fallback: Force hard client navigation via location.assign if App Router push timed out across layout groups
    console.warn(`[SmartAgent] App Router push timed out for ${targetRoute}, executing fallback location assign`);
    window.location.assign(targetRoute);
    return true;
  }, [router]);

  const verifyPostActionState = useCallback(async (expectedRoute: string, expectedEntity?: any): Promise<{ success: boolean; message: string }> => {
    // Fast event-driven check (wait 50ms for React state settlement)
    await new Promise(r => setTimeout(r, 50));

    const { extractLiveDOMContext } = await import('@/lib/ai/live-dom-reader');
    const freshCtx = extractLiveDOMContext(undefined, true);
    const currentPath = window.location.pathname + window.location.search;

    const isMatch = currentPath === expectedRoute || currentPath.startsWith(expectedRoute);
    const isError = freshCtx.loadState === 'error' || freshCtx.loadState === 'not-found' || freshCtx.loadState === 'unauthorized';

    if (isError) {
      return {
        success: false,
        message: `⚠️ Access / Page Error: Target route ${expectedRoute} returned ${freshCtx.loadState || 'an error'}.`
      };
    }

    if (!isMatch && currentPath !== expectedRoute) {
      return {
        success: false,
        message: `⚠️ Navigation failed: Current page is still ${currentPath} instead of ${expectedRoute}.`
      };
    }

    let entityMessage = '';
    if (expectedEntity && freshCtx.currentEntity) {
      if (freshCtx.currentEntity.id === expectedEntity.id) {
        entityMessage = ` Verified entity: ${freshCtx.currentEntity.title}`;
      }
    }

    return {
      success: true,
      message: `✅ Opened ${freshCtx.pageTitle || expectedRoute} (${currentPath}).${entityMessage}`
    };
  }, []);

  // Clean up on Provider unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  // ─── VOICE SESSION CONTROLLER FUNCTIONS ───

  const stopSpeech = () => {
    if (geminiLiveSessionRef.current) {
      geminiLiveSessionRef.current.stop();
    }
    stopAssistantSpeech();
    if (voiceStateRef.current === 'SPEAKING_AI') {
      setVoiceState('IDLE');
    }
  };

  const stopVoiceSession = () => {
    voiceSessionIdRef.current++;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (geminiLiveSessionRef.current) {
      geminiLiveSessionRef.current.stop();
      geminiLiveSessionRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    stopAssistantSpeech();
    setInterimTranscript('');
    setVoiceState('STOPPED');
  };

  const startVoiceListening = async () => {
    if (isLoading) return;

    // 1. Increment session ID and cleanup previous session
    const currentSessionId = ++voiceSessionIdRef.current;
    if (geminiLiveSessionRef.current) {
      geminiLiveSessionRef.current.stop();
      geminiLiveSessionRef.current = null;
    }

    // 2. SYNCHRONOUS AudioContext Creation / Resume inside user gesture
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
      console.log('[AUDIO] context created');
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().then(() => {
        console.log('[AUDIO] context resumed');
      }).catch(err => {
        console.warn('[AUDIO] AudioContext resume failed:', err);
      });
    }

    console.log(`[AUDIO] AudioContext state: ${audioCtxRef.current.state}, sampleRate=${audioCtxRef.current.sampleRate}, baseLatency=${audioCtxRef.current.baseLatency || 0}`);

    setVoiceNotice(null);
    setVoiceState('THINKING');

    const session = new GeminiLiveSession(
      {
        onStateChange: (state) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setVoiceState(state as RealtimeVoiceState);
        },
        onConnectionStateChange: (connState) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setConnectionState(connState);
        },
        onAssistantTextChunk: (chunk) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && (lastMsg as any).isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: lastMsg.content + chunk }
              ];
            } else {
              return [
                ...prev,
                { role: 'assistant', content: chunk, isStreaming: true } as any
              ];
            }
          });
        },
        onAssistantTextComplete: (fullText) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && (lastMsg as any).isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: fullText, isStreaming: false } as any
              ];
            }
            return prev;
          });
        },
        onToolExecuted: (toolName, result) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          let executedContent = result.message || `Executed ${toolName}`;

          if (result.data) {
            if (result.data.sheetId) agentSessionStateRef.current.sheetId = result.data.sheetId;
            if (result.data.problemId) agentSessionStateRef.current.problemId = result.data.problemId;
            if (result.data.problemTitle) agentSessionStateRef.current.problemTitle = result.data.problemTitle;
            if (result.data.number) agentSessionStateRef.current.problemNumber = result.data.number;
            if ((result.data.code || result.data.sectionTitle) && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('bce-update-latex', { detail: result.data }));
            }

            if (result.data.clientDOMAction) {
              const { actionType, query, valueToType, elementIndex } = result.data.clientDOMAction;
              const domRes = executeDOMActionOnPage(actionType, query, valueToType, elementIndex);
              if (domRes.success) {
                executedContent = `✅ ${domRes.message}`;
              } else {
                executedContent = `⚠️ ${domRes.message}`;
              }
            }
          }

          const targetRoute = result.expectedRoute || result.url;
          if (targetRoute) {
            performRealNavigation(targetRoute);
          }
          if (result.pendingNavigation && result.navigationId && targetRoute) {
            setPendingVerification({
              navigationId: result.navigationId,
              expectedRoute: targetRoute,
              expectedEntity: result.expectedEntity,
              successMessage: result.successMessage || 'Navigation complete.',
              voiceTriggered: true,
              timestamp: Date.now()
            });
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: executedContent,
              toolExecuted: toolName,
              actions: result.url ? [{ label: `Open ${toolName}`, url: result.url }] : undefined
            }
          ]);
        },
        onError: (errMsg) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setVoiceNotice(errMsg);
          setVoiceState('STOPPED');
          setConnectionState('error');
        }
      },
      liveContext,
      undefined,
      audioCtxRef.current,
      currentSessionId
    );

    geminiLiveSessionRef.current = session;
    await session.start();
  };

  const stopVoiceRecordingAndSend = async () => {
    stopVoiceSession();
  };

  const toggleVoiceRecording = async () => {
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

  const clearMemory = () => {
    clearAgentMemory();
    setMemorySummary(null);
    setVoiceNotice('AI Memory cleared cleanly.');
    setTimeout(() => setVoiceNotice(null), 3000);
  };

  const clearConversation = () => {
    stopVoiceSession();
    agentSessionStateRef.current = { route: pathname || '/dashboard' };
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

  const getAudioDiagnostics = (): AudioDiagnostics => {
    const audioContextState = audioCtxRef.current 
      ? audioCtxRef.current.state 
      : (geminiLiveSessionRef.current?.getAudioContextState() || 'none');
    
    const micStreamState = geminiLiveSessionRef.current 
      ? geminiLiveSessionRef.current.getMicStreamState() 
      : { exists: false, trackState: null, trackEnabled: false };
    
    const outputSource = geminiLiveSessionRef.current 
      ? 'gemini_pcm' 
      : (getSpeechSynthesisSpeaking() ? 'web_speech' : 'none');
    
    let silentReason: AudioDiagnostics['silentReason'] = null;
    if (realtimeVoiceState === 'STOPPED') {
      silentReason = 'PLAYBACK_IDLE';
    } else if (audioContextState === 'suspended') {
      silentReason = 'AUDIO_CONTEXT_SUSPENDED';
    } else if (!micStreamState.exists) {
      silentReason = 'NO_MIC_STREAM';
    } else if (micStreamState.trackState !== 'live') {
      silentReason = 'MIC_TRACK_NOT_LIVE';
    } else if (!micStreamState.trackEnabled) {
      silentReason = 'MIC_TRACK_DISABLED';
    } else if (realtimeVoiceState === 'LISTENING') {
      silentReason = 'AWAITING_SPEECH';
    }

    return {
      audioContextState,
      connectionState,
      micAvailable: micStreamState.exists,
      micTrackState: micStreamState.trackState,
      micTrackEnabled: micStreamState.trackEnabled,
      inputRms: 0,
      inputDb: -100,
      outputRms: 0,
      outputDb: -100,
      inputSamplesActive: false,
      outputSamplesActive: false,
      agentPlaybackActive: realtimeVoiceState === 'SPEAKING_AI',
      outputSource,
      silentReason
    };
  };

  // ─── POST-NAVIGATION HANDSHAKE VERIFICATION EFFECT ───
  useEffect(() => {
    if (!pendingVerification) return;

    const { navigationId, expectedRoute, expectedEntity, successMessage, voiceTriggered, timestamp, retried } = pendingVerification;

    // Timeout safety check (8s)
    const timeoutTimer = setTimeout(() => {
      if (pendingVerification) {
        if (!retried) {
          // Attempt ONE automatic recovery retry
          console.log('[UI Verification] Verification timed out, attempting 1 recovery retry to:', expectedRoute);
          router.push(expectedRoute);
          setPendingVerification(prev => prev ? { ...prev, retried: true, timestamp: Date.now() } : null);
          return;
        }

        // Verification failed after retry -> Honest failure reporting (NO FALSE SUCCESS)
        setPendingVerification(null);
        setExecutionState('IDLE');
        setMessages((prev) => 
          prev.map((msg) => 
            msg.navigationState === 'NAVIGATING'
              ? { 
                  ...msg, 
                  navigationState: 'FAILED',
                  content: `${msg.content}\n\n⚠️ Could not verify page state for ${expectedRoute}. Please try opening again.`
                }
              : msg
          )
        );
      }
    }, 8000);

    const checkState = () => {
      const currentRoute = pathname;
      let routeMatches = currentRoute === expectedRoute || currentRoute.startsWith(expectedRoute);
      let entityMatches = true;

      if (expectedEntity && liveContext?.currentEntity) {
        entityMatches = liveContext.currentEntity.type === expectedEntity.type && liveContext.currentEntity.id === expectedEntity.id;
      }

      // Ensure visible page load state is not an error or 404
      const isPageError = liveContext?.loadState === 'error' || liveContext?.loadState === 'not-found';

      if (routeMatches && entityMatches && !isPageError) {
        clearTimeout(timeoutTimer);
        setPendingVerification(null);
        setExecutionState('IDLE');

        setMessages((prev) => 
          prev.map((msg) => 
            msg.navigationState === 'NAVIGATING'
              ? { 
                  ...msg, 
                  navigationState: 'VERIFIED',
                  content: `${msg.content}\n\n✅ Verified: ${successMessage}`
                }
              : msg
          )
        );
      }
    };

    checkState();

    return () => {
      clearTimeout(timeoutTimer);
    };
  }, [pathname, liveContext, pendingVerification, router]);

  // ─── MAIN TEXT CHAT PROMPT HANDLER (ULTRA-LOW LATENCY PIPELINE) ───
  const handleSendPrompt = async (
    textToSend?: string, 
    confirmedTool?: { toolName: string; args: any },
    isVoiceTrigger = false
  ) => {
    const promptText = textToSend || inputVal;
    if (!promptText.trim() && !confirmedTool) return;

    // 1. Prevent Duplicate Requests & Cancel Previous Pending Actions (Requirement 9)
    if (activeAbortControllerRef.current) {
      console.log('[SmartAgent] Cancelling previous active request for new user command');
      activeAbortControllerRef.current.abort();
    }
    activeAbortControllerRef.current = new AbortController();
    const signal = activeAbortControllerRef.current.signal;

    const tracker = new LatencyTracker(promptText);
    tracker.markStage('stt');

    stopSpeech();
    setInputVal('');
    setCurrentPromptText(promptText);
    setIsLoading(true);
    setVoiceNotice(null);
    setExecutionState('UNDERSTANDING');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (promptText.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: promptText, timestamp }
      ]);
    }

    // 2. Tier 1: Deterministic Client Fast-Path Router (Requirement 1, 5, 8)
    const fastPath = resolveClientFastPath(promptText, userRoleRef.current, activeContext);
    tracker.markStage('intentResolution');
    tracker.markStage('permissionCheck');

    if (fastPath.isMatch && !confirmedTool) {
      tracker.setFastPath('client');
      tracker.setCacheHit(true);

      if (!fastPath.allowed) {
        const errorMsg = fastPath.permissionReason || 'Access denied: You do not have permission for this section.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${errorMsg}`, navigationState: 'UNAUTHORIZED' }
        ]);
        setExecutionState('FAILED');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      // Streaming Responses (Requirement 7): Show immediate UI response
      setExecutionState(fastPath.clientAction === 'navigate' ? 'NAVIGATING' : 'EXECUTING');
      
      const initialMessage = fastPath.streamingMessage || 'Processing command...';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: initialMessage,
          navigationState: fastPath.targetRoute ? 'NAVIGATING' : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      if (fastPath.clientAction === 'close') {
        closeDrawer();
        setExecutionState('IDLE');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      if (fastPath.clientAction === 'back') {
        router.back();
        setMessages(prev => prev.map(m => m.content === initialMessage ? {
          ...m, content: '✅ Navigated back.', navigationState: 'VERIFIED'
        } : m));
        setExecutionState('IDLE');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      if (fastPath.clientAction === 'context') {
        const fresh = liveContext || {};
        const titleStr = fresh.pageTitle || fresh.route;
        const headingsStr = fresh.visibleHeadings && fresh.visibleHeadings.length > 0 ? fresh.visibleHeadings.join(', ') : 'None';
        const contentStr = `📄 **Current Page**: ${titleStr} (\`${fresh.route}\`)\n\n• **Headings**: ${headingsStr}\n• **Summary**: ${fresh.visibleTextContent?.slice(0, 300) || 'None'}`;

        setMessages(prev => prev.map(m => m.content === initialMessage ? {
          ...m, content: contentStr, navigationState: 'VERIFIED'
        } : m));
        setExecutionState('IDLE');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      if (fastPath.targetRoute) {
        tracker.markStage('navigation');
        await performRealNavigation(fastPath.targetRoute);

        if (signal.aborted) return;

        tracker.markStage('verification');
        const verification = await verifyPostActionState(fastPath.targetRoute);

        if (signal.aborted) return;

        tracker.markStage('response');
        const finalContent = verification.success ? `✅ ${fastPath.successMessage || 'Navigation complete.'}` : verification.message;

        setMessages(prev => prev.map(m => m.content === initialMessage ? {
          ...m,
          content: finalContent,
          navigationState: verification.success ? 'VERIFIED' : 'FAILED'
        } : m));

        setExecutionState('IDLE');
        setIsLoading(false);
        tracker.finish();
        return;
      }
    }

    // 3. Tier 2 & 3: Server Fast-Path & LLM Fallback
    try {
      tracker.markStage('toolExecution');
      tracker.recordApiCall();

      const formattedHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await askSmartAgentAction({
        prompt: promptText,
        history: formattedHistory,
        pageContext: liveContext as any,
        confirmedTool,
        sessionState: agentSessionStateRef.current
      });

      if (signal.aborted) return;

      if (response.sessionState) {
        agentSessionStateRef.current = {
          ...agentSessionStateRef.current,
          ...response.sessionState
        };
      }

      if (response.data && (response.data.code || response.data.sectionTitle) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bce-update-latex', { detail: response.data }));
      }

      if (!response.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Sorry, ${response.message || 'I encountered an issue processing that.'}` }
        ]);
        setExecutionState('FAILED');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      let displayMessage = response.message;

      if (response.data && response.data.clientDOMAction) {
        tracker.recordDomScan();
        const { actionType, query, valueToType, elementIndex } = response.data.clientDOMAction;
        const domRes = executeDOMActionOnPage(actionType, query, valueToType, elementIndex);
        if (domRes.success) {
          displayMessage = `✅ ${domRes.message}`;
        } else {
          displayMessage = `⚠️ ${domRes.message}`;
        }
      }

      const targetRoute = response.expectedRoute || (
        response.actions && response.actions.length > 0 && !response.actions[0].isExternal
          ? response.actions[0].url
          : null
      );

      if (targetRoute) {
        tracker.markStage('navigation');
        setExecutionState('NAVIGATING');
        await performRealNavigation(targetRoute);

        if (signal.aborted) return;

        tracker.markStage('verification');
        const verification = await verifyPostActionState(targetRoute, response.expectedEntity);
        if (verification.success) {
          displayMessage = verification.message;
        } else {
          displayMessage = verification.message;
        }
      }

      tracker.markStage('response');
      const nextMsg: SmartAgentMessage = {
        role: 'assistant',
        content: displayMessage,
        actions: response.actions,
        requiresConfirmation: response.requiresConfirmation,
        toolExecuted: response.toolExecuted,
        navigationState: targetRoute ? 'VERIFIED' : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, nextMsg]);

      if (fastPath.clientAction === 'exitVoiceSession') {
        if (isVoiceModeRef.current && response.message) {
          speakAssistantResponse(response.message, {
            onStart: () => setVoiceState('SPEAKING_AI'),
            onEnd: () => stopVoiceSession()
          });
        } else {
          stopVoiceSession();
        }
      } else if (isVoiceModeRef.current && response.message) {
        speakAssistantResponse(response.message, {
          onStart: () => setVoiceState('SPEAKING_AI'),
          onEnd: () => {
            if (isVoiceModeRef.current && voiceStateRef.current !== 'STOPPED') {
              setVoiceState('LISTENING');
              if (!geminiLiveSessionRef.current) {
                startVoiceListening();
              }
            }
          }
        });
      }

      setExecutionState('IDLE');
      setIsLoading(false);
      tracker.finish();
    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) {
        console.log('[SmartAgent] Request aborted successfully');
        return;
      }
      console.error('[SmartAgentSessionContext Error]:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'An unexpected error occurred. Please try again.' }
      ]);
      setExecutionState('FAILED');
      setIsLoading(false);
      tracker.finish();
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
        connectionState,
        inputVal,
        setInputVal,
        isLoading,
        isListening,
        setIsListening,
        isTranscribing,
        setIsTranscribing,
        isSpeaking,
        isVoiceMode,
        setIsVoiceMode,
        interimTranscript,
        voiceNotice,
        setVoiceNotice,
        handleSendPrompt,
        stopSpeech,
        stopVoiceSession,
        startVoiceListening,
        stopVoiceRecordingAndSend,
        toggleVoiceRecording,
        memorySummary,
        clearMemory,
        clearConversation,
        getDynamicLoadingText,
        getInputAnalyserNode: () => geminiLiveSessionRef.current?.getInputAnalyserNode() || null,
        getOutputAnalyserNode: () => geminiLiveSessionRef.current?.getOutputAnalyserNode() || null,
        getAudioDiagnostics
      }}
    >
      {children}
    </SmartAgentSessionContext.Provider>
  );
}

export function useSmartAgentSession() {
  const context = useContext(SmartAgentSessionContext);
  if (!context) {
    throw new Error('useSmartAgentSession must be used within a SmartAgentSessionProvider');
  }
  return context;
}
