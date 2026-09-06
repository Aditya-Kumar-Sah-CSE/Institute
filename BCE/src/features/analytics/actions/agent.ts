'use server';

import { getUser, createAdminClient } from '@/lib/supabase/server';
import { getStudent360Profile } from '../services/student-intelligence';
import { AgentController, AgentControllerResponse } from '@/lib/ai/agent-controller';
import { AgentChatMessage } from '@/lib/ai/agent';
import { AgentPageContext } from '@/lib/ai/agent-context';
import { normalizeAgentRole } from '@/lib/auth/agent-permissions';

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
  try {
    const user = await getUser();
    let userRole = 'guest';
    let studentProfile = null;

    if (user) {
      try {
        const adminClient = await createAdminClient();
        const { data: profile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        userRole = normalizeAgentRole(profile?.role || user.user_metadata?.role);
      } catch (err) {
        userRole = normalizeAgentRole(user.user_metadata?.role || 'student');
      }

      try {
        studentProfile = await getStudent360Profile(user.id);
      } catch (err) {
        // Fallback default student profile
        studentProfile = { userId: user.id };
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
      sessionState: input.sessionState
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
