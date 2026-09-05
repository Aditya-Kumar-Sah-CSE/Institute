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
      content: `Hi! I'm **Smart Learn AI Agent** ✦\n\nI can execute actions, open courses, launch DSA sheets, search YouTube/GPT, open LaTeX editor, and manage your routine or goals using natural language or voice commands.\n\nTry one of the commands below!`,
      actions: [
        { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
        { label: 'Explore Courses', url: '/courses' }
      ]
    }
  ]);

  const [activeContext, setActiveContext] = useState<ActiveContext>({});
  const [executionState, setExecutionState] = useState<AgentExecutionState>('IDLE');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  const isProcessingRef = useRef<boolean>(false);

  const toggleDrawer = () => setIsOpen(prev => !prev);
  const openDrawer = (initialPrompt?: string) => {
    setIsOpen(true);
    if (initialPrompt && initialPrompt.trim()) {
      handleSendPrompt(initialPrompt);
    }
  };
  const closeDrawer = () => setIsOpen(false);

  const stopSpeech = () => {
    stopAssistantSpeech();
    setIsSpeaking(false);
    if (executionState === 'SPEAKING') {
      setExecutionState('IDLE');
    }
  };

  const clearConversation = () => {
    stopSpeech();
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
        if (isVoiceMode || voiceTriggered) {
          speakAssistantResponse(failMsg, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
          });
        } else {
          setExecutionState('IDLE');
        }
      }
    }, 8000);

    // Read liveContext for verification update
    if (liveContext) {
      const loadState = liveContext.loadState || 'ready';
      const actualRoute = liveContext.route;
      const actualEntity = liveContext.currentEntity;

      if (process.env.NODE_ENV === 'development') {
        console.log('[SMART AGENT DEBUG - VERIFYING STEP]', {
          navigationId,
          expectedRoute,
          actualRoute,
          loadState,
          expectedEntity,
          actualEntity
        });
      }

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

        if (isVoiceMode || voiceTriggered) {
          setExecutionState('SPEAKING');
          speakAssistantResponse(notFoundText, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
          });
        } else {
          setExecutionState('IDLE');
        }
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

        if (isVoiceMode || voiceTriggered) {
          setExecutionState('SPEAKING');
          speakAssistantResponse(errText, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
          });
        } else {
          setExecutionState('IDLE');
        }
        return;
      }

      // Case C: Page is Ready! Perform Target Entity Comparison
      if (loadState === 'ready') {
        // If an expected entity was requested, verify match
        if (expectedEntity) {
          const typeMatches = actualEntity?.type === expectedEntity.type;
          const idMatches = actualEntity?.id === expectedEntity.id;
          const titleMatches = actualEntity?.title && expectedEntity.title
            ? actualEntity.title.toLowerCase().includes(expectedEntity.title.toLowerCase()) || expectedEntity.title.toLowerCase().includes(actualEntity.title.toLowerCase())
            : false;

          if (typeMatches && (idMatches || titleMatches)) {
            // VERIFIED MATCH!
            clearTimeout(timeoutTimer);
            setPendingVerification(null);

            // Update persistent conversation activeContext
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

            if (isVoiceMode || voiceTriggered) {
              setExecutionState('SPEAKING');
              speakAssistantResponse(successMessage, {
                onStart: () => setIsSpeaking(true),
                onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
              });
            } else {
              setExecutionState('IDLE');
            }
            return;
          } else {
            // ENTITY MISMATCH DETECTED!
            // E.g., user requested "Leetcode 100 Basics" but page opened "Codeforces 900"
            clearTimeout(timeoutTimer);
            setPendingVerification(null);
            setExecutionState('FAILED');
            const mismatchText = `Requested ${expectedEntity.type} open nahi ho paayi, isliye main success nahi bol raha.`;
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: mismatchText,
              navigationState: 'FAILED',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            if (isVoiceMode || voiceTriggered) {
              setExecutionState('SPEAKING');
              speakAssistantResponse(mismatchText, {
                onStart: () => setIsSpeaking(true),
                onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
              });
            } else {
              setExecutionState('IDLE');
            }
            return;
          }
        } else {
          // General route without entity requirement (e.g. /code-arena/sheets listing)
          clearTimeout(timeoutTimer);
          setPendingVerification(null);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: successMessage,
            navigationState: 'VERIFIED',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);

          if (isVoiceMode || voiceTriggered) {
            setExecutionState('SPEAKING');
            speakAssistantResponse(successMessage, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => { setIsSpeaking(false); setExecutionState('IDLE'); }
            });
          } else {
            setExecutionState('IDLE');
          }
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

        // Trigger router navigation
        if (targetUrl && targetUrl !== pathname) {
          router.push(targetUrl);
        } else {
          // Already on target page, set state to VERIFYING
          setExecutionState('VERIFYING');
        }
      } else {
        // Non-navigation response (Data tool / pure text)
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

          // Update activeContext for external or direct links
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

          // Auto-speak response if Voice Mode is active OR voice command was used
          if (isVoiceMode || isVoiceTrigger) {
            setExecutionState('SPEAKING');
            const spoke = speakAssistantResponse(res.message, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => {
                setIsSpeaking(false);
                setExecutionState('IDLE');
              },
              onError: () => {
                setIsSpeaking(false);
                setExecutionState('IDLE');
              }
            });
            if (!spoke && !isSpeechSynthesisSupported()) {
              setVoiceNotice('Response is ready, but voice playback is unavailable on this browser.');
              setExecutionState('IDLE');
            }
          } else {
            setExecutionState('IDLE');
          }
        }
      }
    } catch (err) {
      setExecutionState('IDLE');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while executing the command. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
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
