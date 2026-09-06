import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';
import { AGENT_TOOLS, AgentToolResult } from '@/lib/ai/agent-tools';
import { normalizeAgentRole, requireAgentPermission, canUseTool } from '@/lib/auth/agent-permissions';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    let userRole = 'guest';

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

    // Strict Permission Gate Check
    const permCheck = requireAgentPermission(user, userRole, 'tool', toolName);
    if (!permCheck.allowed) {
      const statusCode = !user || userRole === 'guest' ? 401 : 403;
      return NextResponse.json(
        { 
          success: false, 
          errorCode: statusCode === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN', 
          message: permCheck.reason || 'Please log in first. This section is available to authenticated users.' 
        },
        { status: statusCode }
      );
    }

    // Execute tool with authenticated user context
    const result: AgentToolResult = await tool.execute(args, user || { id: 'guest' }, pageContext);

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
