'use server';

import { getUser } from '@/lib/supabase/server';
import { getStudent360Profile } from '../services/student-intelligence';
import { runSmartAgent, AgentChatMessage, AgentResponse } from '@/lib/ai/agent';
import { AgentPageContext } from '@/lib/ai/agent-context';
import { AGENT_TOOLS } from '@/lib/ai/agent-tools';

export async function askSmartAgentAction(input: {
  prompt: string;
  history?: AgentChatMessage[];
  pageContext?: AgentPageContext;
  confirmedTool?: {
    toolName: string;
    args: any;
  };
}): Promise<AgentResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: 'Authentication required. Please log in.',
        error: 'AUTH_REQUIRED'
      };
    }

    // Handle user-confirmed high-risk tool execution directly
    if (input.confirmedTool) {
      const { toolName, args } = input.confirmedTool;
      if (AGENT_TOOLS[toolName]) {
        const result = await AGENT_TOOLS[toolName].execute(args, user, input.pageContext);
        const actions: Array<{ label: string; url: string; isExternal?: boolean }> = [];
        if (result.url) actions.push({ label: 'Open Page', url: result.url });
        if (result.externalUrl) actions.push({ label: 'View External Link', url: result.externalUrl, isExternal: true });

        return {
          success: result.success,
          message: result.message,
          actions: actions.length > 0 ? actions : undefined,
          toolExecuted: toolName,
          pendingNavigation: result.pendingNavigation,
          navigationId: result.navigationId,
          expectedRoute: result.expectedRoute,
          expectedEntity: result.expectedEntity,
          successMessage: result.successMessage
        };
      }
    }

    const studentProfile = await getStudent360Profile(user.id);

    const response = await runSmartAgent({
      user,
      studentProfile,
      prompt: input.prompt,
      history: input.history,
      pageContext: input.pageContext
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[SMART AGENT DEBUG]', {
        prompt: input.prompt,
        toolExecuted: response.toolExecuted || 'NONE',
        actionsCount: response.actions?.length || 0,
        responseMsg: response.message
      });
    }

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
