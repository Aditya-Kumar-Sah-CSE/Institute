import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';
import { AGENT_TOOLS, AgentToolResult } from '@/lib/ai/agent-tools-server';
import { normalizeAgentRole, requireAgentPermission } from '@/lib/auth/agent-permissions';

const CONFIRMATION_REQUIRED = new Set([
  'writeFile', 'deleteFile', 'runTerminalCommand', 'clearPersistentMemory', 'clearMemory',
  'launchPermittedApp', 'writeLocalWorkspaceFile'
]);

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
        userRole = normalizeAgentRole(profile?.role || 'student');
      } catch {
        userRole = 'student';
      }
    }

    const body = await request.json();
    const { toolName, args = {}, pageContext, confirmed = false } = body;

    if (!toolName || typeof toolName !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid toolName parameter' }, { status: 400 });
    }

    const tool = AGENT_TOOLS[toolName];
    if (!tool) {
      return NextResponse.json({ success: false, message: `Tool "${toolName}" not found` }, { status: 404 });
    }

    const permission = requireAgentPermission(user, userRole, 'tool', toolName);
    if (!permission.allowed) {
      return NextResponse.json({
        success: false,
        errorCode: !user || userRole === 'guest' ? 'AUTH_REQUIRED' : 'FORBIDDEN',
        message: permission.reason || 'You are not allowed to use this tool.'
      }, { status: !user || userRole === 'guest' ? 401 : 403 });
    }

    if (CONFIRMATION_REQUIRED.has(toolName) && confirmed !== true) {
      return NextResponse.json({
        success: false,
        errorCode: 'CONFIRMATION_REQUIRED',
        message: 'Explicit confirmation is required before this action can run.'
      }, { status: 400 });
    }

    const result: AgentToolResult = await tool.execute(
      args,
      user || { id: 'guest' },
      { ...(pageContext || {}), __agentConfirmation: confirmed === true }
    );
    return NextResponse.json({ success: true, toolName, result });
  } catch (error: any) {
    console.error('[Agent Tool API Error]:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Tool execution failed' }, { status: 500 });
  }
}
