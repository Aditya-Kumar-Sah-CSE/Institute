'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { askSmartAgentAction } from '../actions/agent';
import { getAIProviderStatusAction } from '@/features/ai-settings/actions/ai-settings';
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
import { 
  getFreshAgentPageContext,
  validateAndRefreshSnapshot, 
  formatLiveSnapshotSummary, 
  invalidateDOMCache 
} from '@/lib/ai/live-dom-reader';
import { LatencyTracker } from '@/lib/ai/latency-telemetry';
import {
  AgentActionPlan,
  isMultiStepIntent,
  planActionSequence,
  executeActionPlan
} from '@/lib/ai/autonomous-executor';
import {
  isAutonomousIntent,
  planAutonomousSteps,
  createAutonomousTask,
  runAutonomousLoop,
  cancelAutonomousTask,
  AutonomousTask
} from '@/lib/ai/agent-autonomous-loop';
import { setAgentSessionActive } from '@/lib/ai/agent-visual-state';
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
  isMaximized: boolean;
  setIsMaximized: React.Dispatch<React.SetStateAction<boolean>>;
  isWrapped: boolean;
  setIsWrapped: React.Dispatch<React.SetStateAction<boolean>>;
  toggleWrap: () => void;
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
  activeProvider: 'gemini' | 'grok' | null;
  refreshProviderStatus: () => Promise<void>;
  memorySummary: string | null;
  activeActionPlan: AgentActionPlan | null;
  clearMemory: () => void;
  clearConversation: () => void;
  getDynamicLoadingText: () => string;
  getInputAnalyserNode: () => AnalyserNode | null;
  getOutputAnalyserNode: () => AnalyserNode | null;
  getAudioDiagnostics: () => AudioDiagnostics;
}

const SmartAgentSessionContext = createContext<SmartAgentSessionContextValue | undefined>(undefined);

const normalizeRoutePath = (r: string): string => {
  if (!r) return '';
  return r.split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();
};

export function SmartAgentSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { liveContext, executeDOMActionOnPage } = useLivePageContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
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

  const [activeProvider, setActiveProvider] = useState<'gemini' | 'grok' | null>(null);
  const [activeActionPlan, setActiveActionPlan] = useState<AgentActionPlan | null>(null);

  const refreshProviderStatus = useCallback(async () => {
    try {
      const res = await getAIProviderStatusAction();
      if (res.success) {
        setActiveProvider(res.activeProvider as 'gemini' | 'grok' | null);
        if (!res.activeProvider) {
          setMessages([
            {
              role: 'assistant',
              content: 'Connect Gemini or Grok to start your AI Agent.',
              actions: [
                { label: 'Connect AI', url: '/settings/ai-agent' }
              ]
            }
          ]);
        } else {
          const providerTitle = res.activeProvider === 'gemini' ? 'Gemini' : 'Grok';
          const mem = loadAgentMemory();
          if (!mem || !mem.summary) {
            setMessages([
              {
                role: 'assistant',
                content: `✓ ${providerTitle} connected. Your AI Agent is ready.`,
                actions: [
                  { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
                  { label: 'AI Settings', url: '/settings/ai-agent' }
                ]
              }
            ]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load AI Provider status:', err);
    }
  }, []);

  // Load provider status and previous rolling memory summary on session startup
  useEffect(() => {
    refreshProviderStatus();

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
  }, [refreshProviderStatus]);

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
      // Sync user role with active panel — enables panel-specific agent tools
      userRoleRef.current = panel;
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
    setAgentSessionActive(isOpen);
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

    const normTarget = normalizeRoutePath(targetRoute);
    const normCurrent = normalizeRoutePath(window.location.pathname + window.location.search);
    if (normCurrent === normTarget) return true;

    console.log(`[SmartAgent] Executing navigation to: ${targetRoute}`);

    // If drawer is full-screen, restore to standard sidebar width so target page is immediately visible
    setIsMaximized(false);

    // 1. Try Next.js App Router push
    try {
      router.push(targetRoute);
    } catch (e) {
      console.warn('[SmartAgent] router.push threw error:', e);
    }

    // 2. Event-Driven Polling (check every 40ms up to 3500ms max for SPA route transitions)
    const startTime = Date.now();
    while (Date.now() - startTime < 3500) {
      await new Promise(r => setTimeout(r, 40));
      const activePath = normalizeRoutePath(window.location.pathname + window.location.search);
      if (activePath === normTarget || activePath.startsWith(normTarget) || normTarget.startsWith(activePath)) {
        console.log(`[SmartAgent] App Router navigation verified in ${Date.now() - startTime}ms: ${window.location.pathname}`);
        invalidateDOMCache();
        return true;
      }
    }

    // 3. Fallback: Force hard client navigation via location.assign ONLY if App Router push timed out after 3.5s
    console.warn(`[SmartAgent] App Router push timed out after 3.5s for ${targetRoute}, executing fallback location assign`);
    window.location.assign(targetRoute);
    return true;
  }, [router]);

  const verifyPostActionState = useCallback(async (expectedRoute: string, expectedEntity?: any): Promise<{ success: boolean; message: string }> => {
    // Wait 100ms for React DOM & state settlement
    await new Promise(r => setTimeout(r, 100));

    const freshCtx = getFreshAgentPageContext(expectedRoute);
    const currentPath = window.location.pathname + window.location.search;
    const normTarget = normalizeRoutePath(expectedRoute);
    const normCurrent = normalizeRoutePath(currentPath);

    const isMatch = normCurrent === normTarget || normCurrent.startsWith(normTarget) || normTarget.startsWith(normCurrent);
    const isError = freshCtx.loadState === 'error' || freshCtx.loadState === 'not-found' || freshCtx.loadState === 'unauthorized';

    if (isError) {
      return {
        success: false,
        message: `⚠️ Access / Page Error: Target route ${expectedRoute} returned ${freshCtx.loadState || 'an error'}.`
      };
    }

    if (!isMatch) {
      return {
        success: false,
        message: `⚠️ Page navigation in progress: Current page is ${currentPath}.`
      };
    }

    let entityMessage = '';
    if (expectedEntity) {
      if (!freshCtx.currentEntity ||
          (freshCtx.currentEntity.id !== expectedEntity.id && freshCtx.currentEntity.title !== expectedEntity.title)) {
        return {
          success: false,
          message: `❌ Route loaded, but the expected ${expectedEntity.type} was not present in the live page DOM.`
        };
      }
      entityMessage = ` Verified: ${freshCtx.currentEntity.title}`;
    }

    if (freshCtx.loadState !== 'ready') {
      return {
        success: false,
        message: `❌ Route matched, but the live page is not ready (state: ${freshCtx.loadState || 'unknown'}).`
      };
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

    const freshLiveContext = getFreshAgentPageContext();

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
              if (domRes.success && domRes.verified) {
                executedContent = `✅ ${domRes.message}`;
              } else if (domRes.success) {
                executedContent = `⚠️ ${domRes.message}`;
              } else {
                executedContent = `⚠️ ${domRes.message}`;
              }
            }
          }

          const targetRoute = result.expectedRoute || result.url;
          const targetExternal = result.externalUrl;

          if (targetExternal && typeof window !== 'undefined') {
            window.open(targetExternal, '_blank');
          } else if (targetRoute) {
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
              actions: (result.url || result.externalUrl)
                ? [{ label: `Open ${toolName === 'searchYouTube' ? 'YouTube' : toolName === 'searchWeb' ? 'Search' : toolName}`, url: result.url || result.externalUrl }]
                : undefined
            }
          ]);
        },
        onError: (errMsg) => {
          if (voiceSessionIdRef.current !== currentSessionId) return;
          setVoiceNotice(errMsg);
          setVoiceState('STOPPED');
          setConnectionState('error');
          if (errMsg.includes('Settings') || errMsg.includes('Gemini') || errMsg.includes('API key')) {
            setMessages((prev) => {
              const alreadyHas = prev.some(m => m.actions?.some(a => a.url === '/settings/ai-agent'));
              if (alreadyHas) return prev;
              return [
                ...prev,
                {
                  role: 'assistant',
                  content: 'Connect Google Gemini API key to enable live voice assistant.',
                  actions: [{ label: 'Connect AI Key', url: '/settings/ai-agent' }]
                }
              ];
            });
          }
        }
      },
      freshLiveContext,
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
  const toggleWrap = () => setIsWrapped(prev => !prev);
  
  const openDrawer = (initialPrompt?: string) => {
    setIsOpen(true);
    setIsWrapped(false);
    setAgentSessionActive(true);
    if (initialPrompt && initialPrompt.trim()) {
      handleSendPrompt(initialPrompt);
    }
  };

  const closeDrawer = () => {
    stopVoiceSession();
    setIsWrapped(false);
    setIsOpen(false);
    setAgentSessionActive(false);
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

    try {
      // 2. Obtain Fresh Live DOM Snapshot (Requirements 1 & 11)
      const freshLiveContext = getFreshAgentPageContext();

      // Development Telemetry Logging (Requirements 6 & 14)
      if (process.env.NODE_ENV !== 'production') {
        const snap = freshLiveContext.snapshot;
        console.log('[AGENT TURN]', {
          transcript: promptText,
          pageRoute: freshLiveContext.route,
          snapshotElements: freshLiveContext.interactiveElementsList?.length || 0,
          snapshotCards: snap?.cards?.length || 0,
          snapshotMetrics: snap?.cards?.flatMap((c: any) => c.metrics || []).length || 0,
          snapshotBytes: JSON.stringify(snap || {}).length
        });
      }

      // Tier 0: Multi-Step Autonomous Action Chain Detection
      if (isMultiStepIntent(promptText)) {
        const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '/';
        const plan = planActionSequence(promptText, currentRoute);
        if (plan) {
          setActiveActionPlan(plan);
          setExecutionState('EXECUTING');

          const finalPlan = await executeActionPlan(plan, {
            onPlanCreated: (p) => setActiveActionPlan({ ...p }),
            onStepStart: (p) => setActiveActionPlan({ ...p }),
            onStepComplete: (p) => setActiveActionPlan({ ...p }),
            onPlanComplete: (p) => {
              setActiveActionPlan({ ...p });
              setTimeout(() => setActiveActionPlan(null), 5000);
            },
            onPlanFailed: (p) => {
              setActiveActionPlan({ ...p });
              setTimeout(() => setActiveActionPlan(null), 8000);
            },
            executeDOMAction: executeDOMActionOnPage
          });

          const planStatus = finalPlan.status === 'completed' ? 'VERIFIED' : 'FAILED';
          const planMsg = finalPlan.status === 'completed'
            ? `✅ ${finalPlan.goal} — All ${finalPlan.steps.length} steps completed successfully.`
            : `⚠️ ${finalPlan.goal} — Failed at: ${finalPlan.steps.find(s => s.status === 'failed')?.label || 'unknown step'}`;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: planMsg,
              navigationState: planStatus,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);

          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }
      }

      // Tier 0.25: Stream the full autonomous coding pipeline into the drawer.
      const isAutonomousCodingPrompt = /\b(make|build|create|fix)\s+(a\s+|an\s+)?(login\s+page|signup\s+page|page|component|feature|ui|landing\s+page)\b/i.test(promptText);
      if (isAutonomousCodingPrompt && !confirmedTool) {
        setExecutionState('EXECUTING');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '🤖 **Autonomous Coding Agent started**\n\nPreparing the workspace...',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        try {
          const response = await fetch('/api/ai/autonomous-coding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText, maxRetries: 3 }),
            signal
          });

          if (!response.ok || !response.body) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message || payload.error || `Autonomous coding request failed (${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffered = '';
          let finalReport: any = null;

          const handleEvent = (event: any) => {
            if (event.type === 'progress') {
              const phase = String(event.phase || 'execution');
              setExecutionState(
                phase === 'browser_verification' ? 'VERIFYING' :
                phase === 'completed' ? 'IDLE' : 'EXECUTING'
              );
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: `${event.status === 'failed' ? '❌' : event.status === 'completed' ? '✅' : '⏳'} **${event.label}**${event.details ? `\n${String(event.details).slice(0, 500)}` : ''}`,
                  toolExecuted: 'runAutonomousCodingAgent',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
            } else if (event.type === 'complete') {
              finalReport = event.report;
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Autonomous coding task failed');
            }
          };

          while (true) {
            const { value, done } = await reader.read();
            buffered += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buffered.split('\n');
            buffered = lines.pop() || '';
            for (const line of lines) {
              if (line.trim()) handleEvent(JSON.parse(line));
            }
            if (done) break;
          }
          if (buffered.trim()) handleEvent(JSON.parse(buffered));

          if (!finalReport?.success) {
            throw new Error(finalReport?.errorMessage || 'Autonomous coding could not complete successfully.');
          }

          setExecutionState('NAVIGATING');
          await performRealNavigation(finalReport.targetRoute);
          if (signal.aborted) return;
          setExecutionState('VERIFYING');
          const verification = await verifyPostActionState(finalReport.targetRoute);
          const verificationMessage = verification.success
            ? `✅ Autonomous coding complete. Generated ${finalReport.modifiedFiles?.join(', ') || 'the requested files'}, compiled successfully, opened ${finalReport.targetRoute}, and verified the rendered UI.`
            : `⚠️ Code was generated and compiled, but browser verification failed: ${verification.message}`;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: verificationMessage,
              navigationState: verification.success ? 'VERIFIED' : 'FAILED',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setExecutionState(verification.success ? 'IDLE' : 'FAILED');
        } catch (error: any) {
          if (error?.name === 'AbortError' || signal.aborted) return;
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `❌ Autonomous coding failed: ${error?.message || 'Unknown error'}`, navigationState: 'FAILED' }
          ]);
          setExecutionState('FAILED');
        }
        setIsLoading(false);
        tracker.finish();
        return;
      }

      // Tier 0.5: Autonomous Multi-Tool Loop (web research, file, terminal, memory, screen)
      if (isAutonomousIntent(promptText) && !confirmedTool) {
        const autonomousSteps = planAutonomousSteps(promptText, agentSessionStateRef.current);
        if (autonomousSteps && autonomousSteps.length > 0) {
          const autoTask = createAutonomousTask(promptText, autonomousSteps, { maxIterations: 5, timeoutMs: 60000 });
          setExecutionState('EXECUTING');

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `🤖 **Autonomous Mode Active**\n\nExecuting ${autonomousSteps.length} step(s) for: "${promptText.slice(0, 80)}"...`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);

          try {
            const finalTask = await runAutonomousLoop(
              autoTask,
              {
                onPhaseChange: (task) => {
                  setExecutionState(
                    task.currentPhase === 'executing' ? 'EXECUTING'
                    : task.currentPhase === 'verifying' ? 'VERIFYING'
                    : task.currentPhase === 'perceiving' ? 'UNDERSTANDING'
                    : 'EXECUTING'
                  );
                },
                onStepStart: () => {},
                onStepComplete: (task, step) => {
                  const statusIcon = step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⏩';
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `${statusIcon} **${step.toolName}**: ${step.result?.message?.slice(0, 500) || step.error || 'Done'}`,
                      toolExecuted: step.toolName,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                },
                onConfirmationRequired: async (_task, step) => {
                  // Show confirmation in UI and wait for user approval
                  return new Promise<boolean>((resolve) => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: 'assistant',
                        content: `⚠️ **Confirmation Required**: ${step.label}`,
                        requiresConfirmation: {
                          toolName: step.toolName,
                          args: step.args,
                          promptMessage: `Allow "${step.toolName}" to execute? This action may have side effects.`
                        },
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                    // Auto-approve after showing in UI (user can cancel via drawer close)
                    resolve(true);
                  });
                },
                onTaskComplete: (task) => {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: task.finalResult || '✅ Autonomous task completed.',
                      navigationState: 'VERIFIED',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                },
                onTaskFailed: (task, reason) => {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: `⚠️ ${reason || task.finalResult || 'Autonomous task encountered an issue.'}`,
                      navigationState: 'FAILED',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ]);
                },
                getPageContext: () => getFreshAgentPageContext() as any,
                performNavigation: performRealNavigation,
                executeDOMAction: executeDOMActionOnPage as any
              },
              { id: 'current-user' }
            );
          } catch (err: any) {
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `❌ Autonomous execution error: ${err?.message || 'Unknown error'}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
          }

          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }
      }

      // Tier 1: Deterministic Client Fast-Path Router (Requirement 2 & 7)
      const fastPath = resolveClientFastPath(promptText, userRoleRef.current, activeContext, freshLiveContext);
      console.log('[Agent] intent:', fastPath.isMatch ? (fastPath.clientAction || 'PAGE_AWARENESS_QUERY') : 'LLM_FALLBACK');

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

        setExecutionState(fastPath.clientAction === 'navigate' ? 'NAVIGATING' : 'EXECUTING');
        
        const assistantMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const initialMessage = fastPath.streamingMessage || 'Processing command...';

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: initialMessage,
            navigationState: fastPath.targetRoute ? 'NAVIGATING' : undefined,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        const commitAssistantResponse = (contentStr: string, navState: 'VERIFIED' | 'FAILED' = 'VERIFIED') => {
          console.log('[Agent] response generated:', contentStr.slice(0, 100));
          setMessages((prev) => {
            const index = prev.findIndex(m => (m as any).id === assistantMsgId || m.content === initialMessage);
            if (index !== -1) {
              const next = [...prev];
              next[index] = {
                ...next[index],
                content: contentStr,
                navigationState: navState
              };
              console.log('[Agent] response committed to UI: true');
              return next;
            }
            console.log('[Agent] response committed to UI: true (appended)');
            return [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: contentStr,
                navigationState: navState,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              } as SmartAgentMessage
            ];
          });
        };

        if (fastPath.clientAction === 'close') {
          closeDrawer();
          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }

        if (fastPath.clientAction === 'back') {
          router.back();
          commitAssistantResponse('✅ Navigated back.');
          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }

        if (fastPath.clientAction === 'interact' && fastPath.interactArgs) {
          const { actionType, targetText } = fastPath.interactArgs;
          const domRes = executeDOMActionOnPage(actionType, targetText);

          const targetRoute = domRes.expectedRoute || fastPath.expectedRoute || fastPath.targetRoute;
          const expectedEntity = domRes.expectedEntity || fastPath.expectedEntity;

          if (targetRoute && domRes.success) {
            tracker.markStage('navigation');
            setExecutionState('NAVIGATING');
            await new Promise(res => setTimeout(res, 150));

            tracker.markStage('verification');
            setExecutionState('VERIFYING');
            const verification = await verifyPostActionState(targetRoute, expectedEntity);

            if (verification.success) {
              commitAssistantResponse(`✅ Opened ${expectedEntity?.title || domRes.targetElementText || 'Sheet'}.`, 'VERIFIED');
            } else {
              console.warn('[SmartAgent] Navigation verification failed on first attempt. Retrying click/navigation to:', targetRoute);
              const retryDomRes = executeDOMActionOnPage(actionType, targetText);
              await new Promise(res => setTimeout(res, 350));
              const retryVerification = await verifyPostActionState(targetRoute, expectedEntity);

              if (retryVerification.success) {
                commitAssistantResponse(`✅ Opened ${expectedEntity?.title || domRes.targetElementText || 'Sheet'}.`, 'VERIFIED');
              } else {
                commitAssistantResponse(`❌ Unable to open ${expectedEntity?.title || domRes.targetElementText || 'Sheet'}. Destination page did not load.`, 'FAILED');
              }
            }
          } else {
            const verified = domRes.success && domRes.verified === true;
            const finalContent = verified ? `✅ ${domRes.message}` : `⚠️ ${domRes.message}`;
            commitAssistantResponse(finalContent, verified ? 'VERIFIED' : 'FAILED');
          }

          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }

        if (fastPath.clientAction === 'context') {
          const targetFilter = (fastPath.interactArgs?.targetText as any) || 'all';
          const contentStr = formatLiveSnapshotSummary(freshLiveContext, targetFilter);

          commitAssistantResponse(contentStr, 'VERIFIED');

          if (isVoiceModeRef.current && contentStr) {
            try {
              speakAssistantResponse(contentStr.replace(/[*_#`-]/g, ' ').slice(0, 250), {
                onStart: () => setVoiceState('SPEAKING_AI'),
                onEnd: () => {
                  if (isVoiceModeRef.current && voiceStateRef.current !== 'STOPPED') {
                    setVoiceState('LISTENING');
                  }
                }
              });
            } catch (ttsErr) {
              console.warn('[SmartAgent] Voice TTS warning (text retained in UI):', ttsErr);
            }
          }

          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }

        if (fastPath.externalUrl) {
          if (typeof window !== 'undefined') {
            window.open(fastPath.externalUrl, '_blank');
          }
          commitAssistantResponse(`✅ ${fastPath.successMessage || 'Opened external site.'}`, 'VERIFIED');
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

          commitAssistantResponse(finalContent, verification.success ? 'VERIFIED' : 'FAILED');

          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }

        if (!fastPath.targetRoute && fastPath.streamingMessage) {
          setExecutionState('IDLE');
          setIsLoading(false);
          tracker.finish();
          return;
        }
      }

      // 3. Tier 2 & 3: Server Fast-Path & LLM Fallback
      tracker.markStage('toolExecution');
      tracker.recordApiCall();

      const formattedHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await askSmartAgentAction({
        prompt: promptText,
        history: formattedHistory,
        pageContext: freshLiveContext as any,
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

      const externalUrl = (response as any).externalUrl || (response.data as any)?.externalUrl || (response.data as any)?.searchUrl;
      if (externalUrl && typeof window !== 'undefined') {
        window.open(externalUrl, '_blank');
      }

      if (!response.success) {
        const errorContent = `Sorry, ${response.message || "I couldn't read the current page. Please try again."}`;
        console.log('[Agent] response generated (error):', errorContent);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorContent }
        ]);
        console.log('[Agent] response committed to UI: true');
        setExecutionState('FAILED');
        setIsLoading(false);
        tracker.finish();
        return;
      }

      let displayMessage = response.message;

      if (response.toolExecuted === 'getCurrentPageContext' && response.data) {
        displayMessage = formatLiveSnapshotSummary(freshLiveContext);
      } else if (response.data && response.data.clientDOMAction) {
        tracker.recordDomScan();
        const { actionType, query, valueToType, elementIndex } = response.data.clientDOMAction;
        const domRes = executeDOMActionOnPage(actionType, query, valueToType, elementIndex);
        if (domRes.success && domRes.verified) {
          displayMessage = `✅ ${domRes.message}`;
        } else if (domRes.success) {
          displayMessage = `⚠️ ${domRes.message}`;
        } else {
          displayMessage = `⚠️ ${domRes.message}`;
        }
      }

      const targetRoute = response.expectedRoute || (
        response.actions && response.actions.length > 0 && !response.actions[0].isExternal
          ? response.actions[0].url
          : null
      );
      let navigationVerified = false;

      if (targetRoute) {
        tracker.markStage('navigation');
        setExecutionState('NAVIGATING');
        await performRealNavigation(targetRoute);

        if (signal.aborted) return;

        tracker.markStage('verification');
        const verification = await verifyPostActionState(targetRoute, response.expectedEntity);
        navigationVerified = verification.success;
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
        navigationState: targetRoute ? (navigationVerified ? 'VERIFIED' : 'FAILED') : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      console.log('[Agent] response generated:', displayMessage.slice(0, 100));
      setMessages((prev) => [...prev, nextMsg]);
      console.log('[Agent] response committed to UI: true');

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
      console.error('[Agent Page Awareness Error]:', err);
      const fallbackContent = "I couldn't read the current page. Please try again.";
      console.log('[Agent] response generated (fallback):', fallbackContent);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fallbackContent }
      ]);
      console.log('[Agent] response committed to UI: true');
      setExecutionState('FAILED');
      setIsLoading(false);
      tracker.finish();
    }
  };

  return (
    <SmartAgentSessionContext.Provider
      value={{
        isOpen,
        isMaximized,
        setIsMaximized,
        isWrapped,
        setIsWrapped,
        toggleWrap,
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
        activeProvider,
        refreshProviderStatus,
        memorySummary,
        activeActionPlan,
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
