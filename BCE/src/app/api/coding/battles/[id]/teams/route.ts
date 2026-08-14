import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all teams for this battle along with members
  const { data: teams, error: teamsError } = await supabase
    .from('coding_battle_teams')
    .select('*, profiles:created_by(full_name)')
    .eq('battle_id', id);

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 400 });
  }

  const { data: participants, error: partsError } = await supabase
    .from('coding_battle_participants')
    .select('student_id, score, team_id, profiles:student_id(full_name, avatar_url)')
    .eq('battle_id', id);

  if (partsError) {
    return NextResponse.json({ error: partsError.message }, { status: 400 });
  }

  // Group participants by team_id
  const teamsWithMembers = teams.map((team: any) => {
    const members = participants.filter((p: any) => p.team_id === team.id);
    return {
      ...team,
      members,
    };
  });

  // Get participants without a team
  const soloParticipants = participants.filter((p: any) => !p.team_id);

  return NextResponse.json({
    success: true,
    teams: teamsWithMembers,
    soloParticipants,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, name, teamId } = body;

    // Fetch battle config
    const { data: battle, error: battleError } = await supabase
      .from('coding_battles')
      .select('*')
      .eq('id', id)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 444 });
    }

    if (!battle.team_mode) {
      return NextResponse.json({ error: 'Team mode is not enabled for this battle.' }, { status: 400 });
    }

    // Ensure student is already in the battle
    const { data: participant, error: partError } = await supabase
      .from('coding_battle_participants')
      .select('*')
      .eq('battle_id', id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (partError || !participant) {
      return NextResponse.json({ error: 'You must join the battle lobby first.' }, { status: 400 });
    }

    if (action === 'create') {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
      }

      // Create new team
      const { data: team, error: teamCreateError } = await supabase
        .from('coding_battle_teams')
        .insert({
          battle_id: id,
          name: name.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (teamCreateError) {
        return NextResponse.json({ error: teamCreateError.message }, { status: 400 });
      }

      // Update participant team_id
      const { error: updateError } = await supabase
        .from('coding_battle_participants')
        .update({ team_id: team.id })
        .eq('battle_id', id)
        .eq('student_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, team });
    } 
    
    if (action === 'join') {
      if (!teamId) {
        return NextResponse.json({ error: 'Team selection required.' }, { status: 400 });
      }

      // Lock check team size
      const { data: teamMembers, error: membersError } = await supabase
        .from('coding_battle_participants')
        .select('student_id')
        .eq('battle_id', id)
        .eq('team_id', teamId);

      if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 400 });
      }

      const maxTeamSize = battle.max_team_size || 1;
      if (teamMembers.length >= maxTeamSize) {
        return NextResponse.json({ error: `Team is full. Max team size is ${maxTeamSize}.` }, { status: 400 });
      }

      // Join team
      const { error: updateError } = await supabase
        .from('coding_battle_participants')
        .update({ team_id: teamId })
        .eq('battle_id', id)
        .eq('student_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } 
    
    if (action === 'leave') {
      const oldTeamId = participant.team_id;
      if (!oldTeamId) {
        return NextResponse.json({ error: 'You are not in a team.' }, { status: 400 });
      }

      // Leave team
      const { error: updateError } = await supabase
        .from('coding_battle_participants')
        .update({ team_id: null })
        .eq('battle_id', id)
        .eq('student_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      // Clean up team if no members left
      const { count } = await supabase
        .from('coding_battle_participants')
        .select('*', { count: 'exact', head: true })
        .eq('battle_id', id)
        .eq('team_id', oldTeamId);

      if (!count || count === 0) {
        await supabase.from('coding_battle_teams').delete().eq('id', oldTeamId);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
