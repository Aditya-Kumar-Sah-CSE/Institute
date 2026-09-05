'use server';

import { getUser } from '@/lib/supabase/server';
import { getStudent360Profile } from '../services/student-intelligence';
import { AgentController, AgentControllerResponse } from '@/lib/ai/agent-controller';
import { AgentChatMessage } from '@/lib/ai/agent';
import { AgentPageContext } from '@/lib/ai/agent-context';

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
    if (!user) {
      return {
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'AUTH_REQUIRED'
      };
    }

    const studentProfile = await getStudent360Profile(user.id);

    const response = await AgentController.processRequest({
      user,
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
