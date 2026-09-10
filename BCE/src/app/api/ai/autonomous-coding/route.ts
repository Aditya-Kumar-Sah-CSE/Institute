import { NextResponse } from 'next/server';
import { getUser, createAdminClient } from '@/lib/supabase/server';
import { AgentOrchestrator } from '@/lib/ai/autonomous/agent-orchestrator';
import { normalizeAgentRole, requireAgentPermission } from '@/lib/auth/agent-permissions';

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
    const { prompt, maxRetries = 3 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid prompt parameter' }, { status: 400 });
    }

    const permission = requireAgentPermission(user, userRole, 'tool', 'runAutonomousCodingAgent');
    if (!permission.allowed) {
      return NextResponse.json({
        success: false,
        errorCode: !user || userRole === 'guest' ? 'AUTH_REQUIRED' : 'FORBIDDEN',
        message: permission.reason || 'You are not allowed to execute autonomous coding tasks.'
      }, { status: !user || userRole === 'guest' ? 401 : 403 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          const report = await AgentOrchestrator.run({
            prompt,
            userRole,
            maxRetries: Math.min(Math.max(Number(maxRetries) || 3, 0), 3),
            onProgress: (phase, label, details, status = 'in_progress') => {
              send({ type: 'progress', phase, label, details, status, timestamp: Date.now() });
            }
          });
          send({ type: 'complete', success: report.success, report });
        } catch (error: any) {
          send({ type: 'error', message: error?.message || 'Autonomous coding task failed' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error: any) {
    console.error('[Autonomous Coding API Error]:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Autonomous coding task failed' }, { status: 500 });
  }
}
