import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCodeArenaActor();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { eventType, detail } = body;

    if (!['paste', 'tab_switch', 'focus_loss', 'devtools'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // 1. Fetch current participant state
    const { data: participant, error: fetchErr } = await adminClient
      .from('coding_battle_participants')
      .select('*')
      .eq('battle_id', id)
      .eq('student_id', user.id)
      .single();

    if (fetchErr || !participant) {
      return NextResponse.json({ error: 'Participant not found in this battle' }, { status: 404 });
    }

    // 2. Fetch battle to make sure it is live
    const { data: battle } = await adminClient
      .from('coding_battles')
      .select('status')
      .eq('id', id)
      .single();

    if (!battle || (battle.status !== 'LIVE' && battle.status !== 'LOBBY')) {
      return NextResponse.json({ error: 'Battle is not active' }, { status: 400 });
    }

    // 3. Increment counters & append logs
    let pasteCount = participant.suspicious_paste_count || 0;
    let tabSwitchCount = participant.tab_switch_count || 0;
    let focusLossCount = participant.focus_loss_count || 0;
    let devtoolsCount = participant.devtools_count || 0;
    let isFlagged = participant.is_flagged || false;

    const timestamp = new Date().toLocaleTimeString();
    const newLogEntry = `[${timestamp}] Detected ${eventType}: ${detail || 'No details'}`;
    const updatedLog = [...(participant.suspicious_log || []), newLogEntry];

    if (eventType === 'paste') pasteCount += 1;
    if (eventType === 'tab_switch') tabSwitchCount += 1;
    if (eventType === 'focus_loss') focusLossCount += 1;
    if (eventType === 'devtools') devtoolsCount += 1;

    // Trigger flagging if threshold exceeded:
    // E.g. > 5 tab switches, > 5 focus losses, > 1 devtools shortcut, or > 2 pastes
    if (tabSwitchCount > 5 || focusLossCount > 5 || devtoolsCount >= 1 || pasteCount > 2) {
      isFlagged = true;
    }

    // 4. Save to DB using admin client
    const { error: updateErr } = await adminClient
      .from('coding_battle_participants')
      .update({
        suspicious_paste_count: pasteCount,
        tab_switch_count: tabSwitchCount,
        focus_loss_count: focusLossCount,
        devtools_count: devtoolsCount,
        suspicious_log: updatedLog,
        is_flagged: isFlagged
      })
      .eq('battle_id', id)
      .eq('student_id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update anti-cheat logs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        suspicious_paste_count: pasteCount,
        tab_switch_count: tabSwitchCount,
        focus_loss_count: focusLossCount,
        devtools_count: devtoolsCount,
        is_flagged: isFlagged
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
