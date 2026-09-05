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
import { GeminiLiveSession } from '@/lib/ai/gemini-live-session';
import { AgentSessionState } from '@/lib/ai/agent-controller';

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

  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  // Single Authoritative Agent Session State Ref
  const agentSessionStateRef = useRef<AgentSessionState>({
    route: pathname || '/dashboard'
  });

  // Gemini Live Session Ref
  const geminiLiveSessionRef = useRef<GeminiLiveSession | null>(null);
  const voiceStateRef = useRef<RealtimeVoiceState>('IDLE');
  const isVoiceModeRef = useRef<boolean>(isVoiceMode);
  const isOpenRef = useRef<boolean>(isOpen);

  // Synchronize active session state with live application context & pathname
  useEffect(() => {
    if (pathname) {
      agentSessionStateRef.current.route = pathname;
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

  // Update voice state helper
  const setVoiceState = (nextState: RealtimeVoiceState) => {
    voiceStateRef.current = nextState;
    setRealtimeVoiceState(nextState);

    setIsListening(nextState === 'LISTENING' || nextState === 'HEARING' || nextState === 'FINALIZING');
    setIsTranscribing(nextState === 'TRANSCRIBING');
    setIsSpeaking(nextState === 'SPEAKING_AI');
  };

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
    if (geminiLiveSessionRef.current) {
      geminiLiveSessionRef.current.stop();
      geminiLiveSessionRef.current = null;
    }
    stopAssistantSpeech();
    setVoiceState('STOPPED');
  };

  const startVoiceListening = async () => {
    if (isLoading) return;

    stopVoiceSession();
    setVoiceNotice(null);

    // Speak instant vocal greeting when mic is opened
    speakAssistantResponse('Hi! Main Smart Learn AI Assistant hoon. Aaj main aapki kaise help karun?', {
      onStart: () => setVoiceState('SPEAKING_AI'),
      onEnd: () => setVoiceState('LISTENING')
    });

    const session = new GeminiLiveSession(
      {
        onStateChange: (state) => {
          setVoiceState(state as RealtimeVoiceState);
        },
        onAssistantTextChunk: (chunk) => {
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
          if (result.data) {
            if (result.data.sheetId) agentSessionStateRef.current.sheetId = result.data.sheetId;
            if (result.data.problemId) agentSessionStateRef.current.problemId = result.data.problemId;
            if (result.data.problemTitle) agentSessionStateRef.current.problemTitle = result.data.problemTitle;
            if (result.data.number) agentSessionStateRef.current.problemNumber = result.data.number;
          }

          if (result.url) {
            router.push(result.url);
          }
          if (result.pendingNavigation && result.navigationId) {
            setPendingVerification({
              navigationId: result.navigationId,
              expectedRoute: result.expectedRoute || result.url,
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
              content: result.message || `Executed ${toolName}`,
              toolExecuted: toolName,
              actions: result.url ? [{ label: `Open ${toolName}`, url: result.url }] : undefined
            }
          ]);
        },
        onError: (errMsg) => {
          setVoiceNotice(errMsg);
          setVoiceState('STOPPED');
        }
      },
      liveContext
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

  // ─── MAIN TEXT CHAT PROMPT HANDLER (AGENT CONTROLLER DRIVEN) ───
  const handleSendPrompt = async (
    textToSend?: string, 
    confirmedTool?: { toolName: string; args: any },
    isVoiceTrigger = false
  ) => {
    const promptText = textToSend || inputVal;
    if (!promptText.trim() && !confirmedTool) return;

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

      if (response.sessionState) {
        agentSessionStateRef.current = {
          ...agentSessionStateRef.current,
          ...response.sessionState
        };
      }

      if (!response.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Sorry, ${response.message || 'I encountered an issue processing that.'}` }
        ]);
        setExecutionState('FAILED');
        setIsLoading(false);
        return;
      }

      setExecutionState('EXECUTING');

      const nextMsg: SmartAgentMessage = {
        role: 'assistant',
        content: response.message,
        actions: response.actions,
        requiresConfirmation: response.requiresConfirmation,
        toolExecuted: response.toolExecuted,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const targetRoute = response.expectedRoute || (
        response.actions && response.actions.length > 0 && !response.actions[0].isExternal
          ? response.actions[0].url
          : null
      );

      if (targetRoute) {
        router.push(targetRoute);
        nextMsg.navigationState = 'NAVIGATING';
        setPendingVerification({
          navigationId: response.navigationId || `nav_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          expectedRoute: targetRoute,
          expectedEntity: response.expectedEntity,
          successMessage: response.successMessage || response.message,
          voiceTriggered: isVoiceTrigger,
          timestamp: Date.now()
        });
      }

      setMessages((prev) => [...prev, nextMsg]);

      if (isVoiceModeRef.current && response.message) {
        speakAssistantResponse(response.message, {
          onStart: () => setVoiceState('SPEAKING_AI'),
          onEnd: () => setVoiceState('IDLE')
        });
      }

      setExecutionState('IDLE');
      setIsLoading(false);
    } catch (err: any) {
      console.error('[SmartAgentSessionContext Error]:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'An unexpected error occurred. Please try again.' }
      ]);
      setExecutionState('FAILED');
      setIsLoading(false);
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
        setIsVoiceMode,
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
  const context = useContext(SmartAgentSessionContext);
  if (!context) {
    throw new Error('useSmartAgentSession must be used within a SmartAgentSessionProvider');
  }
  return context;
}
