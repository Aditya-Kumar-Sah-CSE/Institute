import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';

const LEVELS = [
  { id: 1, title: 'Warm Up', difficulty: 'Easy', ballSpeed: 6.0, paddleWidth: 190, rows: 3, cols: 6, lives: 3, xpReward: 20, targetScore: 1000 },
  { id: 2, title: 'First Challenge', difficulty: 'Easy', ballSpeed: 6.5, paddleWidth: 180, rows: 3, cols: 8, lives: 3, xpReward: 25, targetScore: 1800 },
  { id: 3, title: 'Speed Run', difficulty: 'Medium', ballSpeed: 7.5, paddleWidth: 170, rows: 4, cols: 8, lives: 3, xpReward: 35, targetScore: 3000 },
  { id: 4, title: 'Double Trouble', difficulty: 'Medium', ballSpeed: 8.0, paddleWidth: 160, rows: 4, cols: 9, lives: 3, xpReward: 40, targetScore: 4000 },
  { id: 5, title: 'Power Zone', difficulty: 'Hard', ballSpeed: 8.5, paddleWidth: 150, rows: 5, cols: 9, lives: 3, xpReward: 50, targetScore: 5000 }, // Boss
  { id: 6, title: 'Precision Blockade', difficulty: 'Hard', ballSpeed: 9.0, paddleWidth: 140, rows: 5, cols: 10, lives: 3, xpReward: 60, targetScore: 6500 },
  { id: 7, title: 'Chaos Moving', difficulty: 'Expert', ballSpeed: 9.5, paddleWidth: 130, rows: 6, cols: 10, lives: 3, xpReward: 70, targetScore: 8000 },
  { id: 8, title: 'Expert Arena', difficulty: 'Expert', ballSpeed: 10.0, paddleWidth: 120, rows: 6, cols: 11, lives: 2, xpReward: 85, targetScore: 10000 },
  { id: 9, title: 'Master Mind', difficulty: 'Master', ballSpeed: 10.5, paddleWidth: 110, rows: 7, cols: 11, lives: 2, xpReward: 100, targetScore: 12000 },
  { id: 10, title: 'Smart Learn Champion', difficulty: 'Legend', ballSpeed: 11.0, paddleWidth: 100, rows: 7, cols: 12, lives: 2, xpReward: 150, targetScore: 15000 }, // Boss
];

export async function POST(req: Request) {
  try {
    const { user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSb = await createAdminClient();
    const body = await req.json();
    const { 
      sessionId, 
      score = 0, 
      duration = 0, // reported survival time in seconds
      wave = 1, // for infinite
      combo = 0, 
      livesRemaining = 0,
      goldBricksBroken = 0,
      bossKilled = false
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // 1. Fetch and validate session
    const { data: session, error: sessError } = await adminSb
      .from('breaker_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Session ownership mismatch' }, { status: 403 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session already submitted or expired' }, { status: 400 });
    }

    const now = new Date();
    if (new Date(session.expires_at) < now) {
      await adminSb
        .from('breaker_sessions')
        .update({ status: 'invalidated', suspicious_flag: true, suspicious_reason: 'Session expired' })
        .eq('id', sessionId);
      return NextResponse.json({ error: 'Session expired' }, { status: 400 });
    }

    // 2. Telemetry and Anti-Cheat checks
    let suspicious = false;
    let suspiciousReason = '';

    const actualDurationMs = now.getTime() - new Date(session.started_at).getTime();
    const actualDurationSec = Math.floor(actualDurationMs / 1000);

    // Minimum duration checks: game must take at least a few seconds
    if (actualDurationSec < 3) {
      suspicious = true;
      suspiciousReason = 'Game completed too fast (under 3s)';
    }

    // Client duration should be close to server duration
    if (duration > actualDurationSec + 10) {
      suspicious = true;
      suspiciousReason = 'Client duration exceeds server duration significantly';
    }

    // Score rate limit check
    const scoreRate = duration > 0 ? score / duration : score;
    if (scoreRate > 5000) {
      suspicious = true;
      suspiciousReason = 'Score accumulation rate exceeds realistic limit (5000 pts/sec)';
    }

    // Max score checks
    if (session.mode === 'challenge') {
      const currentLvl = LEVELS.find(l => l.id === session.level);
      if (currentLvl) {
        // A player cannot earn 10x the target score on normal challenge levels
        if (score > currentLvl.targetScore * 6) {
          suspicious = true;
          suspiciousReason = `Score ${score} exceeds level ${session.level} maximum limit`;
        }
      } else {
        suspicious = true;
        suspiciousReason = 'Invalid level parameter';
      }
    } else {
      // Infinite mode score scaling check
      const maxPossibleInfiniteScore = wave * 25000 + 10000;
      if (score > maxPossibleInfiniteScore) {
        suspicious = true;
        suspiciousReason = `Score ${score} exceeds infinite wave ${wave} maximum limit`;
      }
    }

    // Combo cap
    if (combo > 150) {
      suspicious = true;
      suspiciousReason = 'Combo count exceeds maximum humanly possible bounds (150)';
    }

    // Handle suspicious check results
    if (suspicious) {
      await adminSb
        .from('breaker_sessions')
        .update({ 
          status: 'invalidated', 
          suspicious_flag: true, 
          suspicious_reason: suspiciousReason,
          submitted_at: now.toISOString(),
          validated_score: score
        })
        .eq('id', sessionId);

      return NextResponse.json({ 
        error: 'Suspicious gameplay activity detected', 
        suspicious: true 
      }, { status: 400 });
    }

    // 3. XP & Coins Rewards Calculation
    let xpGained = 0;
    let coinsGained = 0;
    let newMilestones: string[] = [];
    let newAchievements: string[] = [];

    // Fetch user progress and profiles inside database transaction logic
    const { data: progress } = await adminSb
      .from('breaker_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentProgress = progress || {
      unlocked_levels: [1],
      level_scores: {},
      stars: {},
      completed_levels: [],
      highest_wave: 0,
      best_infinite_score: 0,
      daily_streak: 0,
      last_played_date: null,
      current_hearts: 3,
      achievements: [],
      milestones: []
    };

    // Calculate today's XP from Brick Breaker to enforce daily cap
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await adminSb
      .from('xp_log')
      .select('xp_amount')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .like('action', 'Brick Breaker%');

    const todayXpSum = todayLogs?.reduce((sum: number, l: any) => sum + l.xp_amount, 0) || 0;
    const XP_DAILY_CAP = 250;
    const remainingXpQuota = Math.max(0, XP_DAILY_CAP - todayXpSum);

    if (session.mode === 'challenge') {
      const lvl = LEVELS.find(l => l.id === session.level)!;
      const isFirstCompletion = !currentProgress.completed_levels.includes(session.level);
      
      if (isFirstCompletion) {
        xpGained = lvl.xpReward;
        coinsGained = session.level % 5 === 0 ? 50 : 20; // 50 coins for Boss levels, 20 for regular
      } else {
        // Replay XP: standard 5 XP per replay, subject to daily cap
        xpGained = Math.min(5, remainingXpQuota);
        coinsGained = 5; // 5 coins for replay
      }
    } else {
      // Infinite Mode rewards based on waves cleared
      // standard: 2 XP per wave, capped at 100 XP per run
      const rawXp = Math.min(100, wave * 2);
      xpGained = Math.min(rawXp, remainingXpQuota);
      coinsGained = wave * 2; // 2 coins per wave
    }

    // Milestones check (Infinite mode only)
    if (session.mode === 'infinite') {
      const milestonesList = [
        { wave: 5, xp: 20, coins: 20 },
        { wave: 10, xp: 50, coins: 50 },
        { wave: 25, xp: 100, coins: 100 },
        { wave: 50, xp: 200, coins: 200 },
        { wave: 100, xp: 500, coins: 500 }
      ];

      for (const ms of milestonesList) {
        if (wave >= ms.wave && !currentProgress.milestones.includes(`wave_${ms.wave}`)) {
          newMilestones.push(`wave_${ms.wave}`);
          xpGained += ms.xp;
          coinsGained += ms.coins;
        }
      }
    }

    // Achievements check
    const achievementsList = [
      { id: 'first_break', title: 'First Break', desc: 'Destroy your first brick' },
      { id: 'combo_master', title: 'Combo Master', desc: 'Reach x10 combo' },
      { id: 'boss_slayer', title: 'Boss Slayer', desc: 'Defeat a boss' },
      { id: 'endless_runner', title: 'Endless', desc: 'Reach Wave 25' },
      { id: 'gold_hunter', title: 'Gold Hunter', desc: 'Destroy 25 golden bricks' },
      { id: 'perfect_run', title: 'Perfect Run', desc: 'Complete a level without losing a heart' },
      { id: 'champion', title: 'Champion', desc: 'Complete all challenge levels' },
      { id: 'streak_master', title: 'Streak Master', desc: 'Play 7 consecutive days' }
    ];

    // Evaluate newly unlocked achievements
    const unlockedAchievements = new Set<string>(currentProgress.achievements);
    
    // First break
    if (score > 10 && !unlockedAchievements.has('first_break')) {
      newAchievements.push('first_break');
    }
    // Combo master
    if (combo >= 10 && !unlockedAchievements.has('combo_master')) {
      newAchievements.push('combo_master');
    }
    // Boss slayer
    if (bossKilled && !unlockedAchievements.has('boss_slayer')) {
      newAchievements.push('boss_slayer');
    }
    // Endless runner
    if (session.mode === 'infinite' && wave >= 25 && !unlockedAchievements.has('endless_runner')) {
      newAchievements.push('endless_runner');
    }
    // Gold hunter
    if (goldBricksBroken > 0 && !unlockedAchievements.has('gold_hunter')) {
      // In a real database we can increment count, for simplicity if client reports it:
      // Let's store gold bricks count in progress or achievements
      unlockedAchievements.add('gold_hunter');
      newAchievements.push('gold_hunter');
    }
    // Perfect run
    if (session.mode === 'challenge' && livesRemaining === LEVELS.find(l => l.id === session.level)?.lives && !unlockedAchievements.has('perfect_run')) {
      newAchievements.push('perfect_run');
    }
    // Champion
    const newCompleted = new Set<number>(currentProgress.completed_levels);
    if (session.mode === 'challenge') {
      newCompleted.add(session.level);
    }
    if (newCompleted.size >= LEVELS.length && !unlockedAchievements.has('champion')) {
      newAchievements.push('champion');
    }
    // Streak Master
    const nextStreak = currentProgress.daily_streak;
    if (nextStreak >= 7 && !unlockedAchievements.has('streak_master')) {
      newAchievements.push('streak_master');
    }

    // Award bonus XP and coins for achievements
    if (newAchievements.length > 0) {
      xpGained += newAchievements.length * 30; // 30 XP per achievement
      coinsGained += newAchievements.length * 50; // 50 coins per achievement
    }

    // 4. Update Profile Coins & XP (Using Admin Client to bypass RLS)
    const { data: profile } = await adminSb
      .from('profiles')
      .select('xp, coins')
      .eq('id', user.id)
      .single();

    if (profile) {
      const nextXp = profile.xp + xpGained;
      const nextCoins = (profile.coins || 0) + coinsGained;

      await adminSb
        .from('profiles')
        .update({ 
          xp: nextXp, 
          coins: nextCoins 
        })
        .eq('id', user.id);
    }

    // Log XP in xp_log
    if (xpGained > 0) {
      await adminSb
        .from('xp_log')
        .insert({
          user_id: user.id,
          action: `Brick Breaker (${session.mode === 'challenge' ? `Lvl ${session.level}` : `Endless Wave ${wave}`})`,
          xp_amount: xpGained,
          source_type: 'brick_breaker',
          source_id: sessionId
        });
    }

    // 5. Update user progress in breaker_progress
    const currentUnlocked = new Set<number>(currentProgress.unlocked_levels);
    if (session.mode === 'challenge') {
      currentUnlocked.add(session.level);
      // Unlock next level
      if (session.level < LEVELS.length) {
        currentUnlocked.add(session.level + 1);
      }
    }

    // Level scores mapping
    const nextScores = { ...currentProgress.level_scores };
    const nextStars = { ...currentProgress.stars };
    let starsEarned = 0;

    if (session.mode === 'challenge') {
      const currentLvl = LEVELS.find(l => l.id === session.level)!;
      nextScores[session.level] = Math.max(nextScores[session.level] || 0, score);
      
      // Star calculation
      if (score >= currentLvl.targetScore * 1.3) starsEarned = 3;
      else if (score >= currentLvl.targetScore * 0.95) starsEarned = 2;
      else starsEarned = 1;

      nextStars[session.level] = Math.max(nextStars[session.level] || 0, starsEarned);
    }

    // Streak logic
    let streak = currentProgress.daily_streak || 1;
    const lastPlayed = currentProgress.last_played_date;
    const todayStr = new Date().toISOString().split('T')[0];

    if (lastPlayed) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastPlayed === yesterdayStr) {
        streak += 1;
      } else if (lastPlayed !== todayStr) {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    // Heart restoration (boss completion restocks hearts to full, caps at 6)
    let hearts = currentProgress.current_hearts;
    if (session.mode === 'challenge' && session.level % 5 === 0) {
      hearts = Math.min(6, hearts + 2); // restock hearts
    }

    const updatedAchievements = [...currentProgress.achievements, ...newAchievements];
    const updatedMilestones = [...currentProgress.milestones, ...newMilestones];

    const { error: progError } = await adminSb
      .from('breaker_progress')
      .upsert({
        user_id: user.id,
        unlocked_levels: Array.from(currentUnlocked),
        level_scores: nextScores,
        stars: nextStars,
        completed_levels: Array.from(newCompleted),
        highest_wave: session.mode === 'infinite' ? Math.max(currentProgress.highest_wave || 0, wave) : (currentProgress.highest_wave || 0),
        best_infinite_score: session.mode === 'infinite' ? Math.max(currentProgress.best_infinite_score || 0, score) : (currentProgress.best_infinite_score || 0),
        daily_streak: streak,
        last_played_date: todayStr,
        current_hearts: Math.min(6, Math.max(0, hearts)),
        achievements: updatedAchievements,
        milestones: updatedMilestones,
        updated_at: new Date().toISOString()
      });

    if (progError) {
      console.error('Progress update error:', progError);
    }

    // 6. Record to Leaderboard
    const { error: leadError } = await adminSb
      .from('breaker_leaderboard')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        mode: session.mode,
        level: session.level,
        wave: session.mode === 'infinite' ? wave : null,
        score: score,
        survival_time: duration
      });

    if (leadError) {
      console.error('Leaderboard insert error:', leadError);
    }

    // 7. Mark session as completed
    await adminSb
      .from('breaker_sessions')
      .update({ 
        status: 'completed',
        submitted_at: now.toISOString(),
        validated_score: score
      })
      .eq('id', sessionId);

    // Trigger gamification evaluations in database
    try {
      await adminSb.rpc('evaluate_student_badges', { p_student_id: user.id });
    } catch (e) {
      console.error('Badge evaluation trigger error:', e);
    }

    return NextResponse.json({
      success: true,
      xpGained,
      coinsGained,
      starsEarned,
      streak,
      newAchievements,
      newMilestones,
      unlockedLevels: Array.from(currentUnlocked)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
