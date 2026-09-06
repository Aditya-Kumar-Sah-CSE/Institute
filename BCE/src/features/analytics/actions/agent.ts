'use server';

import { getUser, createAdminClient } from '@/lib/supabase/server';
import { getStudent360Profile } from '../services/student-intelligence';
import { AgentController, AgentControllerResponse } from '@/lib/ai/agent-controller';
import { AgentChatMessage } from '@/lib/ai/agent';
import { AgentPageContext } from '@/lib/ai/agent-context';
import { normalizeAgentRole } from '@/lib/auth/agent-permissions';

interface CachedUserProfile {
  role: string;
  studentProfile: any;
  timestamp: number;
}

const userProfileCache = new Map<string, CachedUserProfile>();
const CACHE_TTL_MS = 60000; // 60s TTL

export async function askSmartAgentAction(input: {
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
  confirmedTool?: {
    toolName: string;
    args: any;
  };
  sessionState?: any;
}): Promise<AgentControllerResponse> {
  const startTime = Date.now();
  try {
    const user = await getUser();
    let userRole = 'guest';
    let studentProfile = null;

    if (user) {
      const cached = userProfileCache.get(user.id);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        userRole = cached.role;
        studentProfile = cached.studentProfile;
      } else {
        const needs360 = input.prompt.toLowerCase().includes('weak') || 
                         input.prompt.toLowerCase().includes('360') || 
                         input.prompt.toLowerCase().includes('recommend');

        const [profileRes, studentRes] = await Promise.allSettled([
          createAdminClient().then(admin => admin.from('profiles').select('role').eq('id', user.id).maybeSingle()),
          needs360 ? getStudent360Profile(user.id) : Promise.resolve({ userId: user.id })
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          userRole = normalizeAgentRole(profileRes.value.data.role);
        } else {
          userRole = normalizeAgentRole(user.user_metadata?.role || 'student');
        }

        if (studentRes.status === 'fulfilled') {
          studentProfile = studentRes.value;
        } else {
          studentProfile = { userId: user.id };
        }

        userProfileCache.set(user.id, { role: userRole, studentProfile, timestamp: Date.now() });
      }
    }

    const response = await AgentController.processRequest({
      user: user ? { id: user.id } : null,
      userRole,
      studentProfile,
      prompt: input.prompt,
      history: input.history,
      pageContext: input.pageContext,
      confirmedTool: input.confirmedTool,
      sessionState: input.sessionState,
      timestamps: {
        speech_final: startTime
      }
    });

    return response;
  } catch (error: any) {
    console.error('Error in askSmartAgentAction:', error);
    return {
      success: false,
      message: 'Smart Agent is temporarily offline. Please try again.',
      error: error.message || 'SERVER_ERROR'
    };
  }
}
