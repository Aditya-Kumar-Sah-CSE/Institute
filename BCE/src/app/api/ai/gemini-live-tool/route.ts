import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { AGENT_TOOLS, AgentToolResult } from '@/lib/ai/agent-tools';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, errorCode: 'AUTH_REQUIRED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toolName, args = {}, pageContext } = body;

    if (!toolName || typeof toolName !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid toolName parameter' },
        { status: 400 }
      );
    }

    const tool = AGENT_TOOLS[toolName];
    if (!tool) {
      return NextResponse.json(
        { success: false, message: `Tool "${toolName}" not found` },
        { status: 404 }
      );
    }

    // Execute tool
    const result: AgentToolResult = await tool.execute(args, user, pageContext);

    return NextResponse.json({
      success: true,
      toolName,
      result
    });
  } catch (error: any) {
    console.error('[Gemini Live Tool Execution API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Tool execution failed'
      },
      { status: 500 }
    );
  }
}
