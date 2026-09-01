'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  Music, 
  Music2, 
  RotateCcw, 
  LayoutDashboard, 
  Trophy, 
  Sparkles, 
  Lock,
  Star,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowLeft,
  Flame,
  Gamepad2,
  Download,
  Shield as ShieldIcon,
  Award
} from 'lucide-react';
import Link from 'next/link';

// --- GAME CONFIGURATIONS & INTERFACES ---
interface GameLevel {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master' | 'Legend';
  ballSpeed: number;
  paddleWidth: number;
  rows: number;
  cols: number;
  lives: number;
  xpReward: number;
  targetScore: number;
  brickColors: string[];
}

const LEVELS: GameLevel[] = [
  { id: 1, title: 'Warm Up', difficulty: 'Easy', ballSpeed: 5.5, paddleWidth: 190, rows: 3, cols: 6, lives: 3, xpReward: 20, targetScore: 1000, brickColors: ['#a855f7', '#6366f1', '#06b6d4'] },
  { id: 2, title: 'First Challenge', difficulty: 'Easy', ballSpeed: 6.0, paddleWidth: 180, rows: 3, cols: 8, lives: 3, xpReward: 25, targetScore: 1800, brickColors: ['#a855f7', '#3b82f6', '#06b6d4'] },
  { id: 3, title: 'Speed Run', difficulty: 'Medium', ballSpeed: 7.0, paddleWidth: 170, rows: 4, cols: 8, lives: 3, xpReward: 35, targetScore: 3000, brickColors: ['#ec4899', '#a855f7', '#6366f1', '#3b82f6'] },
  { id: 4, title: 'Double Trouble', difficulty: 'Medium', ballSpeed: 7.5, paddleWidth: 160, rows: 4, cols: 9, lives: 3, xpReward: 40, targetScore: 4000, brickColors: ['#ef4444', '#ec4899', '#3b82f6', '#06b6d4'] },
  { id: 5, title: 'Guardian Core', difficulty: 'Hard', ballSpeed: 8.0, paddleWidth: 155, rows: 5, cols: 9, lives: 3, xpReward: 75, targetScore: 5500, brickColors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'] }, // Boss Level
  { id: 6, title: 'Precision Blockade', difficulty: 'Hard', ballSpeed: 8.5, paddleWidth: 140, rows: 5, cols: 10, lives: 3, xpReward: 60, targetScore: 6500, brickColors: ['#f43f5e', '#a855f7', '#10b981', '#3b82f6', '#facc15'] },
  { id: 7, title: 'Chaos Moving', difficulty: 'Expert', ballSpeed: 9.0, paddleWidth: 130, rows: 6, cols: 10, lives: 3, xpReward: 70, targetScore: 8000, brickColors: ['#ec4899', '#f43f5e', '#ef4444', '#10b981', '#6366f1', '#06b6d4'] },
  { id: 8, title: 'Expert Arena', difficulty: 'Expert', ballSpeed: 9.5, paddleWidth: 120, rows: 6, cols: 11, lives: 2, xpReward: 85, targetScore: 10000, brickColors: ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#06b6d4', '#4ade80'] },
  { id: 9, title: 'Master Mind', difficulty: 'Master', ballSpeed: 10.0, paddleWidth: 110, rows: 7, cols: 11, lives: 2, xpReward: 100, targetScore: 12000, brickColors: ['#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4'] },
  { id: 10, title: 'Smart Learn Overlord', difficulty: 'Legend', ballSpeed: 10.5, paddleWidth: 100, rows: 7, cols: 12, lives: 2, xpReward: 150, targetScore: 16000, brickColors: ['#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'] }, // Boss Level
];

// --- VIRTUAL GAME RESOLUTION ---
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const PADDLE_HEIGHT = 22;
const BALL_RADIUS = 10;
const BRICK_PADDING = 12;
const BRICK_TOP_OFFSET = 95;
const BRICK_HEIGHT = 34;
const MAX_PARTICLES = 120;
const MAX_FRAGMENTS = 120;


type GameScreen = 'LOBBY' | 'PREVIEW' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY' | 'LEADERBOARD' | 'ACHIEVEMENTS' | 'INFINITE_VICTORY';
type PowerUpType = 'WIDE_PADDLE' | 'MULTI_BALL' | 'FIRE_BALL' | 'EXTRA_LIFE' | 'SLOW_MOTION' | 'SCORE_BOOST' | 'BOTTOM_SHIELD';
type BrickType = 'NORMAL' | 'STRONG' | 'GOLDEN' | 'POWER' | 'EXPLOSIVE' | 'REGEN' | 'SHIELD' | 'UNBREAKABLE' | 'BOSS_CORE' | 'BOSS_SHIELD';

interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: BrickType;
  durability: number;
  maxDurability: number;
  scoreValue: number;
  destroyed: boolean;
  hitFlashTime: number; // impact flash timer in frames
  shieldActive?: boolean; // For shield bricks
}

interface BallTrail {
  x: number;
  y: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  active: boolean;
  trail: BallTrail[];
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  width: number;
  height: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface BrickFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotVelocity: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
}

interface LocalStats {
  completedLevels: number[];
  unlockedLevels: number[];
  bestScores: Record<number, number>;
  stars: Record<number, number>;
  highestWave: number;
  bestInfiniteScore: number;
  dailyStreak: number;
  currentHearts: number;
  coins: number;
  xp?: number;
  totalXP: number;
  userLevel: string;
  achievements: string[];
  milestones: string[];
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  score: number;
  level?: number;
  wave?: number;
  survival_time: number;
}

export default function GamePage() {
  // Screen and UI states
  const [screen, setScreen] = useState<GameScreen>('LOBBY');
  const [activeLevel, setActiveLevel] = useState<GameLevel>(LEVELS[0]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [powerupDurationLeft, setPowerupDurationLeft] = useState<number>(0);
  const [perfQuality, setPerfQuality] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [goldBricksBrokenCount, setGoldBricksBrokenCount] = useState<number>(0);

  // Endless Mode specific states
  const [infiniteWave, setInfiniteWave] = useState<number>(1);
  const [infiniteRebuildTime, setInfiniteRebuildTime] = useState<number>(12); // seconds
  const [rebuildCountdown, setRebuildCountdown] = useState<number>(12); // real-time visual
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const [gamePlayMode, setGamePlayMode] = useState<'challenge' | 'infinite'>('challenge');

  // Boss Stage Intros
  const [showBossIntro, setShowBossIntro] = useState<boolean>(false);
  const [bossHealth, setBossHealth] = useState<number>(10);
  const [maxBossHealth, setMaxBossHealth] = useState<number>(10);

  // Settings & Responsive Orientation
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [showRotationOverlay, setShowRotationOverlay] = useState<boolean>(false);
  const [pwaInstallSupported, setPwaInstallSupported] = useState<boolean>(false);
  
  // Leaderboards States
  const [leaderboardTab, setLeaderboardTab] = useState<'daily' | 'weekly' | 'all'>('all');
  const [leaderboardModeFilter, setLeaderboardModeFilter] = useState<'challenge' | 'infinite'>('challenge');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  // Sync state
  const [syncPending, setSyncPending] = useState<boolean>(false);
  
  // FPS Monitor
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);

  // Progression Storage
  const [stats, setStats] = useState<LocalStats>({
    completedLevels: [],
    unlockedLevels: [1],
    bestScores: {},
    stars: {},
    highestWave: 0,
    bestInfiniteScore: 0,
    dailyStreak: 0,
    currentHearts: 3,
    coins: 0,
    totalXP: 0,
    userLevel: 'Beginner',
    achievements: [],
    milestones: []
  });

  const [earnedStars, setEarnedStars] = useState<number>(0);
  const [earnedXP, setEarnedXP] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);
  const [sessionAchievements, setSessionAchievements] = useState<string[]>([]);
  const [sessionMilestones, setSessionMilestones] = useState<string[]>([]);

  // References for rendering and game loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bgmStepRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);

  // Live Game Engine Refs (bypassing React re-renders for 60fps physics)
  const paddleRef = useRef({ x: 540, targetX: 540, width: 190, targetWidth: 190, speed: 13.0 });
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const fragmentsRef = useRef<BrickFragment[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const shakeTimerRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const sessionStartTimeRef = useRef<number>(0);
  
  // Powerup state refs
  const powerupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFireballRef = useRef<boolean>(false);
  const isScoreBoostRef = useRef<boolean>(false);
  const hasBottomShieldRef = useRef<boolean>(false);

  // Current session ID & level refs
  const activeSessionIdRef = useRef<string | null>(null);
  const isGameEndingRef = useRef<boolean>(false);
  const activeLevelRef = useRef<GameLevel>(activeLevel);

  useEffect(() => {
    activeLevelRef.current = activeLevel;
  }, [activeLevel]);

  // Timer Ref for Rebuild countdown in Infinite Mode
  const infiniteRebuildTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rebuildSecondsLeftRef = useRef<number>(12);

  // Boss movement ref
  const bossDirectionRef = useRef<number>(1);
  const bossPositionXRef = useRef<number>(540);

  // --- AUDIO SYNTHESIZER ---
  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }, []);

  const playSound = useCallback((type: 'bounce' | 'brick' | 'powerup' | 'life' | 'gameover' | 'victory' | 'boss_hit' | 'explosive') => {
    if (!soundEnabled) return;
    const ctx = initAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.connect(ctx.destination);

    if (type === 'bounce') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, now); // C4
      osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.08); // C3
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'brick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(164.81, now + 0.06); // E3
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'explosive') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.45);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'boss_hit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'powerup') {
      const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.2, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.1);
      });
    } else if (type === 'life') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130.81, now);
      osc.frequency.linearRampToValueAtTime(329.63, now + 0.3);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'gameover') {
      [220, 196, 174.61, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.35, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } else if (type === 'victory') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.35, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    }
  }, [soundEnabled, initAudio]);

  // Synthwave BGM loop
  useEffect(() => {
    if (!musicEnabled || screen !== 'PLAYING') {
      if (bgmTimerRef.current) clearInterval(bgmTimerRef.current);
      return;
    }

    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 98, 87.31];
    bgmStepRef.current = 0;

    bgmTimerRef.current = setInterval(() => {
      const ctx = initAudio();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const freq = bassNotes[bgmStepRef.current % bassNotes.length];
      bgmStepRef.current++;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.16);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    }, 180);

    return () => {
      if (bgmTimerRef.current) clearInterval(bgmTimerRef.current);
    };
  }, [musicEnabled, screen, initAudio]);

  // Haptic feedback API
  const triggerHaptic = (duration: number) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(duration);
      } catch {}
    }
  };

  // Fullscreen + Landscape orientations
  const requestFullscreenAndLandscape = () => {
    if (typeof window === 'undefined') return;
    const container = containerRef.current;
    if (container) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    }
    // Attempt lock screen
    if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
      (window.screen.orientation as any).lock('landscape').catch(() => {});
    }
  };

  const exitFullscreenAndLandscape = () => {
    if (typeof window === 'undefined') return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (window.screen && window.screen.orientation && (window.screen.orientation as any).unlock) {
      try {
        (window.screen.orientation as any).unlock();
      } catch {}
    }
  };

  // Detect PWA Installation prompt support
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      setPwaInstallSupported(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const triggerPwaInstall = () => {
    window.dispatchEvent(new CustomEvent('show-pwa-install'));
  };

  // Safe area window sizes listener
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        if (isMobile && isPortrait && screen === 'PLAYING') {
          setShowRotationOverlay(true);
        } else {
          setShowRotationOverlay(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [screen]);

  // Auto-pause when page goes to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && screen === 'PLAYING') {
        setScreen('PAUSED');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screen]);

  // Disable body scroll when gameplay is active
  useEffect(() => {
    if (screen === 'PLAYING') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [screen]);

  // Helper to normalize progress payload
  const parseServerProgress = (p: any): LocalStats => {
    return {
      unlockedLevels: p.unlocked_levels || p.unlockedLevels || [1],
      completedLevels: p.completed_levels || p.completedLevels || [],
      bestScores: p.level_scores || p.bestScores || p.best_scores || {},
      stars: p.stars || {},
      highestWave: p.highest_wave ?? p.highestWave ?? 0,
      bestInfiniteScore: p.best_infinite_score ?? p.bestInfiniteScore ?? 0,
      achievements: p.achievements || [],
      milestones: p.milestones || [],
      dailyStreak: p.daily_streak || p.dailyStreak || 1,
      currentHearts: p.current_hearts ?? p.currentHearts ?? 3,
      xp: p.xp || 0,
      coins: p.coins || 0,
      userLevel: p.userLevel || p.user_level || 'Beginner'
    };
  };

  // Fetch Progress & stats from Server
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/code-arena/game/progress');
      const data = await res.json();
      if (data.success && data.progress) {
        const normalized = parseServerProgress(data.progress);
        setStats(normalized);
        try {
          localStorage.setItem('smartlearn_breaker_stats', JSON.stringify(normalized));
        } catch {}
        
        // Sync local stats to Server if local has better scores
        try {
          const cached = localStorage.getItem('smartlearn_breaker_stats');
          if (cached) {
            const local = JSON.parse(cached);
            let needsSync = false;
            
            // Check if local unlocked levels or wave is higher
            if (local.highestWave > normalized.highestWave || 
                local.completedLevels?.length > normalized.completedLevels?.length) {
              needsSync = true;
            }

            if (needsSync) {
              setSyncPending(true);
              const syncRes = await fetch('/api/code-arena/game/progress/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  levelScores: local.bestScores || {},
                  stars: local.stars || {},
                  completedLevels: local.completedLevels || [],
                  unlockedLevels: local.unlockedLevels || [1],
                  highestWave: local.highestWave || 0,
                  bestInfiniteScore: local.bestInfiniteScore || 0,
                  achievements: local.achievements || [],
                  milestones: local.milestones || []
                })
              });
              const syncData = await syncRes.json();
              if (syncData.success && syncData.progress) {
                const synced = parseServerProgress({
                  ...syncData.progress,
                  xp: data.progress.xp,
                  coins: data.progress.coins,
                  userLevel: data.progress.userLevel
                });
                setStats(synced);
                localStorage.setItem('smartlearn_breaker_stats', JSON.stringify(synced));
              }
            }
          }
        } catch {}
      }
    } catch (e) {
      // Fallback to local storage if offline
      const cached = localStorage.getItem('smartlearn_breaker_stats');
      if (cached) {
        setStats(JSON.parse(cached));
      }
    } finally {
      setSyncPending(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Load Leaderboard Scores
  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/code-arena/game/leaderboard?mode=${leaderboardModeFilter}&period=${leaderboardTab}`);
      const data = await res.json();
      if (data.success) {
        setLeaderboardEntries(data.leaderboard || []);
        setUserRank(data.userRank || null);
      }
    } catch (e) {
      console.error('Leaderboard load failed', e);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardModeFilter, leaderboardTab]);

  useEffect(() => {
    if (screen === 'LEADERBOARD') {
      fetchLeaderboard();
    }
  }, [screen, fetchLeaderboard]);

  // Initialize Bricks matching visual materials configurations
  const initLevelBricks = useCallback((level: GameLevel) => {
    const bricks: Brick[] = [];
    const cols = level.cols;
    const rows = level.rows;
    const totalPaddingX = BRICK_PADDING * (cols + 1);
    const brickWidth = (GAME_WIDTH - totalPaddingX) / cols;

    // Boss level layouts (Levels 5, 10, etc.)
    const isBossStage = level.id % 5 === 0;

    if (isBossStage) {
      // BOSS LEVEL DESIGN
      const coreHp = level.id === 5 ? 10 : 20;
      setBossHealth(coreHp);
      setMaxBossHealth(coreHp);

      // 1. Core Boss Brick at Top Center
      bricks.push({
        id: 'boss_core',
        x: (GAME_WIDTH - 240) / 2,
        y: BRICK_TOP_OFFSET + 40,
        width: 240,
        height: 55,
        color: '#f43f5e', // Hot pink-red core
        type: 'BOSS_CORE',
        durability: coreHp,
        maxDurability: coreHp,
        scoreValue: 5000,
        destroyed: false,
        hitFlashTime: 0
      });

      bossPositionXRef.current = (GAME_WIDTH - 240) / 2;

      // 2. Shield bricks protecting the boss core (Strong & Unbreakable)
      for (let c = 0; c < cols; c++) {
        const shieldX = BRICK_PADDING + c * (brickWidth + BRICK_PADDING);
        // Only spawn shield bricks close to center
        if (c >= 2 && c <= cols - 3) {
          bricks.push({
            id: `boss_shield_${c}`,
            x: shieldX,
            y: BRICK_TOP_OFFSET + 120,
            width: brickWidth,
            height: BRICK_HEIGHT,
            color: '#a855f7', // Purple shields
            type: 'BOSS_SHIELD',
            durability: 3,
            maxDurability: 3,
            scoreValue: 400,
            destroyed: false,
            hitFlashTime: 0
          });
        }
      }

      // 3. Floating unbreakable support columns
      bricks.push({
        id: 'unbr_l',
        x: BRICK_PADDING + 80,
        y: BRICK_TOP_OFFSET + 50,
        width: 80,
        height: BRICK_HEIGHT,
        color: '#475569',
        type: 'UNBREAKABLE',
        durability: 999,
        maxDurability: 999,
        scoreValue: 0,
        destroyed: false,
        hitFlashTime: 0
      });
      
      bricks.push({
        id: 'unbr_r',
        x: GAME_WIDTH - BRICK_PADDING - 160,
        y: BRICK_TOP_OFFSET + 50,
        width: 80,
        height: BRICK_HEIGHT,
        color: '#475569',
        type: 'UNBREAKABLE',
        durability: 999,
        maxDurability: 999,
        scoreValue: 0,
        destroyed: false,
        hitFlashTime: 0
      });

      bricksRef.current = bricks;
      return;
    }

    // NORMAL CHALLENGE LEVEL DESIGN
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Special brick selections
        const isGolden = Math.random() < 0.05; // 5% gold
        const isExplosive = !isGolden && Math.random() < 0.08; // 8% explosive
        const isUnbreakable = !isGolden && !isExplosive && (level.difficulty === 'Expert' || level.difficulty === 'Master' || level.difficulty === 'Legend') && r === 0 && (c === 1 || c === cols - 2);
        const isRegen = !isGolden && !isExplosive && !isUnbreakable && Math.random() < 0.06;
        const isShield = !isGolden && !isExplosive && !isUnbreakable && !isRegen && Math.random() < 0.05;
        const isPower = !isGolden && !isExplosive && !isUnbreakable && !isRegen && !isShield && Math.random() < 0.12; // 12% power-up bricks

        let bType: BrickType = 'NORMAL';
        let durability = 1;
        let color = level.brickColors[r % level.brickColors.length];
        let scoreVal = 100;

        if (isUnbreakable) {
          bType = 'UNBREAKABLE';
          durability = 999;
          color = '#475569'; // grey slate
          scoreVal = 0;
        } else if (isGolden) {
          bType = 'GOLDEN';
          color = '#fbbf24'; // Metallic Gold
          scoreVal = 500;
        } else if (isExplosive) {
          bType = 'EXPLOSIVE';
          color = '#f97316'; // Neon Orange
          scoreVal = 200;
        } else if (isRegen) {
          bType = 'REGEN';
          color = '#ec4899'; // Hot Pink
          durability = 2;
          scoreVal = 250;
        } else if (isShield) {
          bType = 'SHIELD';
          color = '#3b82f6'; // Bright Cyber Blue
          durability = 2;
          scoreVal = 300;
        } else if (isPower) {
          bType = 'POWER';
          color = '#10b981'; // Vivid Green
          scoreVal = 150;
        } else {
          // Normal brick durability scaling by row
          if (r === 0 && level.rows > 3) {
            bType = 'STRONG';
            durability = 3;
            color = '#ef4444'; // Red
            scoreVal = 300;
          } else if (r === 1 && level.rows > 4) {
            bType = 'STRONG';
            durability = 2;
            color = '#a855f7'; // Purple
            scoreVal = 200;
          }
        }

        bricks.push({
          id: `brick_${r}_${c}`,
          x: BRICK_PADDING + c * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          height: BRICK_HEIGHT,
          color,
          type: bType,
          durability,
          maxDurability: durability,
          scoreValue: scoreVal,
          destroyed: false,
          hitFlashTime: 0,
          shieldActive: bType === 'SHIELD'
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  // Initialize Endless Mode Bricks Wave
  const initEndlessBricks = useCallback((waveIndex: number) => {
    const bricks: Brick[] = [];
    const cols = 9;
    const rows = Math.min(6, 3 + Math.floor(waveIndex / 4));
    const totalPaddingX = BRICK_PADDING * (cols + 1);
    const brickWidth = (GAME_WIDTH - totalPaddingX) / cols;

    // Difficulty params scaling
    const speedDifficulty = Math.min(10, 1 + Math.floor(waveIndex / 5));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Special blocks logic
        const rand = Math.random();
        let bType: BrickType = 'NORMAL';
        let durability = 1;
        let color = '#3b82f6'; // Light Blue
        let scoreVal = 100;

        if (rand < 0.05) {
          bType = 'GOLDEN';
          color = '#fbbf24';
          scoreVal = 500;
        } else if (rand < 0.12) {
          bType = 'EXPLOSIVE';
          color = '#f97316';
          scoreVal = 200;
        } else if (rand < 0.18) {
          bType = 'POWER';
          color = '#10b981';
          scoreVal = 150;
        } else if (rand < 0.22 && waveIndex > 3) {
          bType = 'REGEN';
          color = '#ec4899';
          durability = 2;
          scoreVal = 250;
        } else if (rand < 0.26 && waveIndex > 5) {
          bType = 'SHIELD';
          color = '#06b6d4';
          durability = 2;
          scoreVal = 300;
        } else if (rand < 0.30 && waveIndex > 4) {
          bType = 'UNBREAKABLE';
          durability = 999;
          color = '#475569';
          scoreVal = 0;
        } else if (r === 0 && waveIndex > 2) {
          bType = 'STRONG';
          durability = Math.min(3, 2 + Math.floor(waveIndex / 6));
          color = '#ef4444';
          scoreVal = durability * 100;
        }

        bricks.push({
          id: `endless_${r}_${c}_w${waveIndex}`,
          x: BRICK_PADDING + c * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          height: BRICK_HEIGHT,
          color,
          type: bType,
          durability,
          maxDurability: durability,
          scoreValue: scoreVal,
          destroyed: false,
          hitFlashTime: 0,
          shieldActive: bType === 'SHIELD'
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const selectLevelForPlay = (level: GameLevel) => {
    activeLevelRef.current = level;
    setGamePlayMode('challenge');
    setActiveLevel(level);
    setScreen('PREVIEW');
  };

  const selectInfiniteForPlay = () => {
    setGamePlayMode('infinite');
    setScreen('PREVIEW');
  };

  // Start secure game session from Server
  const startSecureSession = async (overrideLevelId?: number | null) => {
    try {
      const res = await fetch('/api/code-arena/game/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: gamePlayMode,
          level: gamePlayMode === 'challenge' ? (overrideLevelId ?? activeLevelRef.current.id) : null,
          wave: gamePlayMode === 'infinite' ? infiniteWave : null
        })
      });
      const data = await res.json();
      if (data.success && data.sessionId) {
        activeSessionIdRef.current = data.sessionId;
        return true;
      }
    } catch (e) {
      console.error('Failed to create server game session', e);
    }
    return false;
  };

  const startGame = async (levelToStart?: GameLevel | React.SyntheticEvent) => {
    const isGameLevel = (obj: any): obj is GameLevel => Boolean(obj && typeof obj.id === 'number' && typeof obj.ballSpeed === 'number');
    const levelObj = (gamePlayMode === 'challenge' && isGameLevel(levelToStart)) ? levelToStart : activeLevelRef.current;
    activeLevelRef.current = levelObj;
    if (gamePlayMode === 'challenge') {
      setActiveLevel(levelObj);
    }

    isGameEndingRef.current = false;
    const isStarted = await startSecureSession(gamePlayMode === 'challenge' ? levelObj.id : null);
    if (!isStarted) {
      // Try again or alert offline
      alert('Could not start a secure game session. Please check your connection.');
      return;
    }

    sessionStartTimeRef.current = Date.now();
    setGoldBricksBrokenCount(0);

    const speed = gamePlayMode === 'challenge' 
      ? levelObj.ballSpeed 
      : 5.5 + Math.min(4.0, (infiniteWave - 1) * 0.35); // Endless speed scaling

    const paddleW = gamePlayMode === 'challenge'
      ? levelObj.paddleWidth
      : 170; // Endless default paddle

    if (gamePlayMode === 'challenge') {
      initLevelBricks(levelObj);
      setLives(levelObj.lives);
      
      const isBoss = levelObj.id % 5 === 0;
      if (isBoss) {
        setShowBossIntro(true);
        setTimeout(() => setShowBossIntro(false), 2400);
      }
    } else {
      setInfiniteWave(1);
      initEndlessBricks(1);
      setLives(3);
      setIsRebuilding(false);
      rebuildSecondsLeftRef.current = 12;
      setRebuildCountdown(12);

      // Start rebuild interval countdowns
      startRebuildCountdown(12);
    }

    // Set paddle virtual coordinates
    paddleRef.current = {
      x: (GAME_WIDTH - paddleW) / 2,
      targetX: (GAME_WIDTH - paddleW) / 2,
      width: paddleW,
      targetWidth: paddleW,
      speed: 13.0
    };
    
    // Set ball coordinates and clear trail
    ballsRef.current = [
      {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT - 65,
        vx: (Math.random() > 0.5 ? 1 : -1) * speed * 0.7,
        vy: -speed * 0.9,
        speed: speed,
        active: true,
        trail: []
      }
    ];

    powerUpsRef.current = [];
    particlesRef.current = [];
    fragmentsRef.current = [];
    floatTextsRef.current = [];
    comboRef.current = 0;
    
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setActivePowerUp(null);
    setPowerupDurationLeft(0);
    isFireballRef.current = false;
    isScoreBoostRef.current = false;
    hasBottomShieldRef.current = false;
    
    if (powerupTimerRef.current) clearInterval(powerupTimerRef.current);

    requestFullscreenAndLandscape();
    setScreen('PLAYING');
    initAudio();
  };

  const startRebuildCountdown = (sec: number) => {
    if (infiniteRebuildTimerRef.current) clearInterval(infiniteRebuildTimerRef.current);
    rebuildSecondsLeftRef.current = sec;
    setRebuildCountdown(sec);

    infiniteRebuildTimerRef.current = setInterval(() => {
      rebuildSecondsLeftRef.current = parseFloat((rebuildSecondsLeftRef.current - 0.1).toFixed(1));
      setRebuildCountdown(rebuildSecondsLeftRef.current);

      if (rebuildSecondsLeftRef.current <= 0) {
        clearInterval(infiniteRebuildTimerRef.current!);
        triggerInfiniteRebuild();
      }
    }, 100);
  };

  const triggerInfiniteRebuild = () => {
    setIsRebuilding(true);
    triggerHaptic(80);
    playSound('life');

    // Trigger sliding text
    spawnFloatText('WAVE REBUILDING!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '#a855f7');

    setTimeout(() => {
      // Rebuild bricks
      const nextWave = infiniteWave + 1;
      setInfiniteWave(nextWave);
      initEndlessBricks(nextWave);
      setIsRebuilding(false);

      // Scale rebuild time: wave 1: 12s, wave 2: 11.5s, wave 3: 11s, etc. (capped at min 6s)
      const nextRebuildTime = Math.max(6, 12.5 - (nextWave * 0.5));
      setInfiniteRebuildTime(nextRebuildTime);
      startRebuildCountdown(nextRebuildTime);
    }, 1200);
  };

  // Spark burst particles
  const triggerBurst = (x: number, y: number, color: string, count = 10) => {
    const list = particlesRef.current;
    
    // Reduce counts on Low Quality mode to sustain 60 FPS
    const budgetCount = perfQuality === 'LOW' ? Math.floor(count * 0.4) : count;

    if (list.length > MAX_PARTICLES) {
      list.splice(0, budgetCount);
    }
    for (let i = 0; i < budgetCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2;
      list.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.022 + 0.015
      });
    }
  };

  // Fragment burst splits brick physically
  const triggerFragments = (bx: number, by: number, bw: number, bh: number, color: string) => {
    const list = fragmentsRef.current;
    
    // Quality scaling budgets
    const rows = perfQuality === 'LOW' ? 1 : 2;
    const cols = perfQuality === 'LOW' ? 2 : 4;
    const fragW = bw / cols;
    const fragH = bh / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (list.length >= MAX_FRAGMENTS) {
          list.shift(); // Evict oldest
        }

        const fx = bx + c * fragW + fragW / 2;
        const fy = by + r * fragH + fragH / 2;

        const centerX = bx + bw / 2;
        const centerY = by + bh / 2;
        const angle = Math.atan2(fy - centerY, fx - centerX) + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 4 + 3.5;

        list.push({
          x: fx,
          y: fy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2 + 2), // POP UP
          rotation: Math.random() * Math.PI * 2,
          rotVelocity: (Math.random() - 0.5) * 0.28,
          size: Math.random() * 4 + 5,
          color,
          alpha: 1.0,
          decay: Math.random() * 0.015 + 0.012
        });
      }
    }
  };

  const spawnFloatText = (text: string, x: number, y: number, color = '#ffffff') => {
    floatTextsRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      alpha: 1.0,
      color
    });
  };

  // Spawn dropping power-ups from broken special bricks
  const maybeSpawnPowerUp = (x: number, y: number, brickType: BrickType) => {
    let rollChance = 0.16; // default 16% drop chance
    if (brickType === 'POWER') rollChance = 1.0; // 100% drop on POWER brick

    if (Math.random() < rollChance) {
      const types: PowerUpType[] = ['WIDE_PADDLE', 'MULTI_BALL', 'FIRE_BALL', 'EXTRA_LIFE', 'SLOW_MOTION', 'SCORE_BOOST', 'BOTTOM_SHIELD'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const colors: Record<PowerUpType, string> = {
        WIDE_PADDLE: '#06b6d4', // Cyan
        MULTI_BALL: '#a855f7', // Purple
        FIRE_BALL: '#ef4444', // Red-orange
        EXTRA_LIFE: '#10b981', // Emerald green
        SLOW_MOTION: '#3b82f6', // Indigo blue
        SCORE_BOOST: '#f59e0b', // Gold-amber
        BOTTOM_SHIELD: '#00f0ff' // Light neon
      };

      powerUpsRef.current.push({
        x,
        y,
        vy: 3.2, 
        type: chosen,
        width: 32,
        height: 32,
        color: colors[chosen]
      });
    }
  };

  const applyPowerUp = (type: PowerUpType) => {
    playSound('powerup');
    triggerHaptic(60);
    setActivePowerUp(type);
    setPowerupDurationLeft(100); // 100%
    
    spawnFloatText(type.replace('_', ' '), paddleRef.current.x + paddleRef.current.width / 2, GAME_HEIGHT - 85, '#00f0ff');

    if (type === 'EXTRA_LIFE') {
      setLives(prev => Math.min(6, prev + 1));
      setActivePowerUp(null); // Instant
    } else if (type === 'WIDE_PADDLE') {
      const currentWidth = gamePlayMode === 'challenge' ? activeLevel.paddleWidth : 170;
      paddleRef.current.targetWidth = currentWidth * 1.5;
      startPowerupDurationTimer(8000, () => {
        paddleRef.current.targetWidth = currentWidth;
      });
    } else if (type === 'SLOW_MOTION') {
      ballsRef.current.forEach(b => {
        b.vx *= 0.65;
        b.vy *= 0.65;
      });
      startPowerupDurationTimer(8000, () => {
        ballsRef.current.forEach(b => {
          b.vx /= 0.65;
          b.vy /= 0.65;
        });
      });
    } else if (type === 'FIRE_BALL') {
      isFireballRef.current = true;
      startPowerupDurationTimer(8000, () => {
        isFireballRef.current = false;
      });
    } else if (type === 'SCORE_BOOST') {
      isScoreBoostRef.current = true;
      startPowerupDurationTimer(9000, () => {
        isScoreBoostRef.current = false;
      });
    } else if (type === 'BOTTOM_SHIELD') {
      hasBottomShieldRef.current = true;
      setActivePowerUp(null); // instant shield activation
    } else if (type === 'MULTI_BALL') {
      const active = ballsRef.current.filter(b => b.active);
      if (active.length > 0) {
        const base = active[0];
        const newBalls = [
          { x: base.x, y: base.y, vx: base.vx * 0.85 + 2, vy: base.vy * 0.85, speed: base.speed, active: true, trail: [] },
          { x: base.x, y: base.y, vx: base.vx * 0.85 - 2, vy: base.vy * 0.85, speed: base.speed, active: true, trail: [] }
        ];
        ballsRef.current.push(...newBalls);
      }
      setActivePowerUp(null); // instant
    }
  };

  const startPowerupDurationTimer = (duration: number, onEnd: () => void) => {
    if (powerupTimerRef.current) clearInterval(powerupTimerRef.current);
    
    const steps = 20;
    const intervalTime = duration / steps;
    let stepCount = 0;

    powerupTimerRef.current = setInterval(() => {
      stepCount++;
      setPowerupDurationLeft(((steps - stepCount) / steps) * 100);

      if (stepCount >= steps) {
        clearInterval(powerupTimerRef.current!);
        onEnd();
        setActivePowerUp(null);
      }
    }, intervalTime);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyP'].includes(e.code) && screen === 'PLAYING') {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'KeyP') {
        if (screen === 'PLAYING') setScreen('PAUSED');
        else if (screen === 'PAUSED') setScreen('PLAYING');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  // Pointer position mapping
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || screen !== 'PLAYING') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    
    const canvasX = (relativeX * GAME_WIDTH) / rect.width;
    const newTarget = canvasX - paddleRef.current.width / 2;
    paddleRef.current.targetX = Math.max(0, Math.min(GAME_WIDTH - paddleRef.current.width, newTarget));
  };

  // Trigger explosive brick radius damages
  const triggerExplosionDamage = (targetBrick: Brick) => {
    const radius = 170; // 170px explosion radius
    const bricks = bricksRef.current;
    playSound('explosive');
    triggerHaptic(100);

    // Screen shake
    if (perfQuality !== 'LOW') {
      shakeTimerRef.current = 16;
    }

    bricks.forEach(b => {
      if (b.destroyed || b.id === targetBrick.id) return;
      const dx = b.x + b.width / 2 - (targetBrick.x + targetBrick.width / 2);
      const dy = b.y + b.height / 2 - (targetBrick.y + targetBrick.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        if (b.type !== 'UNBREAKABLE') {
          b.durability = 0;
          b.destroyed = true;
          triggerFragments(b.x, b.y, b.width, b.height, b.color);
          triggerBurst(b.x + b.width / 2, b.y + b.height / 2, b.color, 8);
          
          const pts = b.scoreValue;
          setScore(prev => prev + pts);
          spawnFloatText(`+${pts}`, b.x + b.width / 2, b.y, b.color);
        } else {
          // Spark unbreakable
          triggerBurst(b.x + b.width / 2, b.y + b.height / 2, '#475569', 5);
        }
      }
    });
  };

  // Draw 3D Brick bevel borders
  const drawBrick3D = (ctx: CanvasRenderingContext2D, b: Brick) => {
    const x = b.x;
    const y = b.y;
    const w = b.width;
    const h = b.height;
    
    // Draw brick shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(x + 5, y + 5, w, h);

    // If gold brick, draw shine sweep
    if (b.type === 'GOLDEN') {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#fbbf24');
      grad.addColorStop(0.3, '#fef08a'); // gold center shine
      grad.addColorStop(0.5, '#f59e0b');
      grad.addColorStop(1, '#d97706');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = b.color;
    }

    ctx.fillRect(x, y, w, h);

    // If hit flash is active
    if (b.hitFlashTime > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.fillRect(x, y, w, h);
      return;
    }

    // Top Bevel Highlight (Light source top-left)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - 4, y + 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.closePath();
    ctx.fill();

    // Left Bevel Highlight
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y + 4);
    ctx.lineTo(x + 4, y + h - 4);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // Bottom Bevel Shading (Dark shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 4, y + h - 4);
    ctx.lineTo(x + w - 4, y + h - 4);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Right Bevel Shading
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - 4, y + h - 4);
    ctx.lineTo(x + w - 4, y + 4);
    ctx.closePath();
    ctx.fill();

    // Shield brick glows
    if (b.type === 'SHIELD') {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }

    // Render cracks based on durability damage ratio
    if (b.durability < b.maxDurability && b.maxDurability > 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Crack lines branching from center
      ctx.moveTo(cx, cy);
      ctx.lineTo(x + w * 0.2, y + h * 0.25);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x + w * 0.8, y + h * 0.75);

      if (b.durability === 1 && b.maxDurability === 3) {
        // Additional extensive cracking
        ctx.moveTo(cx, cy);
        ctx.lineTo(x + w * 0.85, y + h * 0.15);
        ctx.moveTo(cx, cy);
        ctx.lineTo(x + w * 0.15, y + h * 0.85);
      }
      ctx.stroke();
    }
  };

  // Main Canvas Render & Physics Loops
  useEffect(() => {
    if (screen !== 'PLAYING') {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let previousTimestamp = 0;
    lastFpsTimeRef.current = performance.now();
    frameCountRef.current = 0;

    const gameLoop = (timestamp: number) => {
      if (!previousTimestamp) previousTimestamp = timestamp;
      
      // Delta-time scaling to avoid drops / tab background jumps
      const delta = Math.min((timestamp - previousTimestamp) / 16.666, 1.8); 
      previousTimestamp = timestamp;

      // FPS calculation
      frameCountRef.current++;
      if (timestamp - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = timestamp;
      }

      // Setup clean high-DPI scaling Matrix
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvasRect = canvas.getBoundingClientRect();
      const w = canvasRect.width;
      const h = canvasRect.height;

      // Update backing store resolution dynamically to avoid high-DPI blur/clip
      const targetWidth = Math.floor(w * dpr);
      const targetHeight = Math.floor(h * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.scale(w / GAME_WIDTH, h / GAME_HEIGHT);

      // Camera Shake
      if (shakeTimerRef.current > 0) {
        shakeTimerRef.current--;
        const shakeX = (Math.random() - 0.5) * 6;
        const shakeY = (Math.random() - 0.5) * 6;
        ctx.translate(shakeX, shakeY);
      }

      // Background Navy color
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw cyber Grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_WIDTH; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < GAME_HEIGHT; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }

      // Move Boss (if Boss stage is active)
      const isBossLevel = gamePlayMode === 'challenge' && activeLevel.id % 5 === 0;
      if (isBossLevel) {
        // Move boss core left & right
        const coreBrick = bricksRef.current.find(b => b.type === 'BOSS_CORE');
        if (coreBrick && !coreBrick.destroyed) {
          bossPositionXRef.current += bossDirectionRef.current * 1.5 * delta;
          if (bossPositionXRef.current + coreBrick.width >= GAME_WIDTH - 20) {
            bossDirectionRef.current = -1;
          } else if (bossPositionXRef.current <= 20) {
            bossDirectionRef.current = 1;
          }
          coreBrick.x = bossPositionXRef.current;
        }

        // Move orbiting boss shield bricks
        bricksRef.current.forEach(b => {
          if (b.type === 'BOSS_SHIELD' && !b.destroyed) {
            b.x += bossDirectionRef.current * 1.5 * delta;
          }
        });
      }

      // Move Paddle
      const pad = paddleRef.current;
      if (keysRef.current.left) {
        pad.targetX = Math.max(0, pad.targetX - pad.speed * delta);
      }
      if (keysRef.current.right) {
        pad.targetX = Math.min(GAME_WIDTH - pad.width, pad.targetX + pad.speed * delta);
      }
      
      pad.width += (pad.targetWidth - pad.width) * 0.08 * delta;
      pad.x += (pad.targetX - pad.x) * 0.20 * delta; 

      // Bottom Laser Safety Shield
      if (hasBottomShieldRef.current) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, GAME_HEIGHT - 6);
        ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 6);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // Update Balls & Trails
      const balls = ballsRef.current;
      let activeBallCount = 0;

      balls.forEach(ball => {
        if (!ball.active) return;
        activeBallCount++;

        // Add coordinate to trail history
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) {
          ball.trail.shift();
        }

        // Substepping physics at high speed to prevent wall tunneling
        const stepsCount = ball.speed > 9.5 ? 2 : 1;
        const subVx = (ball.vx * delta) / stepsCount;
        const subVy = (ball.vy * delta) / stepsCount;

        for (let step = 0; step < stepsCount; step++) {
          ball.x += subVx;
          ball.y += subVy;

          // Collision: Left/Right walls
          if (ball.x - BALL_RADIUS <= 0) {
            ball.x = BALL_RADIUS;
            ball.vx = Math.abs(ball.vx);
            playSound('bounce');
          } else if (ball.x + BALL_RADIUS >= GAME_WIDTH) {
            ball.x = GAME_WIDTH - BALL_RADIUS;
            ball.vx = -Math.abs(ball.vx);
            playSound('bounce');
          }

          // Collision: Top boundary
          if (ball.y - BALL_RADIUS <= 0) {
            ball.y = BALL_RADIUS;
            ball.vy = Math.abs(ball.vy);
            playSound('bounce');
          }

          // Collision: Bottom boundary (safety shield vs out of bounds)
          if (ball.y + BALL_RADIUS >= GAME_HEIGHT - 8) {
            if (hasBottomShieldRef.current) {
              ball.y = GAME_HEIGHT - 12 - BALL_RADIUS;
              ball.vy = -Math.abs(ball.vy);
              hasBottomShieldRef.current = false; // destroy shield
              playSound('bounce');
              triggerHaptic(40);
              spawnFloatText('SHIELD BROKEN', ball.x, GAME_HEIGHT - 20, '#00f0ff');
              break;
            } else {
              ball.active = false;
              triggerBurst(ball.x, GAME_HEIGHT - 12, '#ef4444', 8);
              break;
            }
          }

          // Collision: Paddle
          const paddleY = GAME_HEIGHT - PADDLE_HEIGHT - 8;
          if (
            ball.y + BALL_RADIUS >= paddleY &&
            ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
            ball.x >= pad.x &&
            ball.x <= pad.x + pad.width &&
            ball.vy > 0
          ) {
            const relativeHit = (ball.x - (pad.x + pad.width / 2)) / (pad.width / 2);
            const maxAngle = Math.PI / 2.6; // Max bounce angle
            const bounceAngle = relativeHit * maxAngle;
            
            ball.vx = ball.speed * Math.sin(bounceAngle);
            ball.vy = -ball.speed * Math.cos(bounceAngle);
            
            playSound('bounce');
            triggerHaptic(20);
            break;
          }

          // Collision: Bricks
          const bricks = bricksRef.current;
          let activeBricksLeft = 0;

          for (let bIdx = 0; bIdx < bricks.length; bIdx++) {
            const b = bricks[bIdx];
            if (b.destroyed) continue;
            if (b.type !== 'UNBREAKABLE') activeBricksLeft++;

            const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
            const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < BALL_RADIUS) {
              b.hitFlashTime = 4; // Flash overlay timer

              if (b.type !== 'UNBREAKABLE') {
                // If boss hit, handle core damage
                if (b.type === 'BOSS_CORE') {
                  b.durability--;
                  setBossHealth(b.durability);
                  playSound('boss_hit');
                  triggerHaptic(40);
                  triggerBurst(ball.x, ball.y, '#f43f5e', 7);

                  if (b.durability <= 0) {
                    b.destroyed = true;
                    if (!isGameEndingRef.current) {
                      isGameEndingRef.current = true;
                      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
                      // Mega Boss explosion
                      triggerFragments(b.x, b.y, b.width, b.height, '#f43f5e');
                      triggerBurst(b.x + b.width / 2, b.y + b.height / 2, '#ef4444', 35);
                      
                      setScore(prev => prev + 5000);
                      spawnFloatText('+5000 BOSS DEFEAT!', b.x + b.width / 2, b.y, '#f43f5e');
                      playSound('victory');
                      
                      // Win game
                      setTimeout(() => handleVictory(true), 600);
                    }
                  }
                  
                  // Reflect ball
                  if (!isFireballRef.current) {
                    if (Math.abs(distX) > Math.abs(distY)) ball.vx = -ball.vx;
                    else ball.vy = -ball.vy;
                  }
                  break;
                }

                // Normal brick hit
                if (isFireballRef.current) {
                  b.durability = 0;
                } else {
                  b.durability--;
                }

                if (b.durability <= 0) {
                  b.destroyed = true;
                  
                  // realistic physical fragments splits
                  triggerFragments(b.x, b.y, b.width, b.height, b.color);
                  triggerBurst(b.x + b.width / 2, b.y + b.height / 2, b.color, 12);
                  
                  // Spawn dropping items
                  maybeSpawnPowerUp(b.x + b.width / 2, b.y + b.height / 2, b.type);

                  if (b.type === 'GOLDEN') {
                    setGoldBricksBrokenCount(prev => prev + 1);
                    playSound('victory');
                  } else if (b.type === 'EXPLOSIVE') {
                    // Explode adjacent
                    triggerExplosionDamage(b);
                  } else {
                    playSound('brick');
                  }

                  comboRef.current++;
                  setCombo(comboRef.current);
                  setMaxCombo(prev => Math.max(prev, comboRef.current));

                  // Calculate score multiplier
                  const scoreMultiplier = isScoreBoostRef.current ? 2 : 1;
                  const comboMultiplier = 1 + Math.floor(comboRef.current / 4) * 0.5;
                  const points = Math.floor(b.scoreValue * comboMultiplier * scoreMultiplier);

                  setScore(prev => prev + points);
                  spawnFloatText(`+${points}`, b.x + b.width / 2, b.y, b.color);

                  // Screen shake
                  if (b.type === 'GOLDEN' && perfQuality !== 'LOW') {
                    shakeTimerRef.current = 10;
                  }

                  // Check remaining breakable bricks immediately upon destroying a brick
                  if (gamePlayMode === 'challenge' && !isBossLevel && !isGameEndingRef.current) {
                    const remainingBreakable = bricks.filter(br => !br.destroyed && br.type !== 'UNBREAKABLE').length;
                    if (remainingBreakable === 0) {
                      isGameEndingRef.current = true;
                      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
                      playSound('victory');
                      setTimeout(() => handleVictory(false), 300);
                    }
                  }
                } else {
                  triggerBurst(ball.x, ball.y, b.color, 5);
                  playSound('bounce');
                }
              } else {
                // Unbreakable brick hit sparks
                triggerBurst(ball.x, ball.y, '#94a3b8', 6);
                playSound('bounce');
              }

              // Reflect ball if not fireball pierce
              if (!isFireballRef.current) {
                if (Math.abs(distX) > Math.abs(distY)) {
                  ball.vx = -ball.vx;
                } else {
                  ball.vy = -ball.vy;
                }
              }
              break;
            }
          }

          // Check level victory fallback
          if (gamePlayMode === 'challenge' && !isBossLevel && !isGameEndingRef.current) {
            const remainingBreakable = bricks.filter(br => !br.destroyed && br.type !== 'UNBREAKABLE').length;
            if (remainingBreakable === 0) {
              isGameEndingRef.current = true;
              if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
              playSound('victory');
              setTimeout(() => handleVictory(false), 300);
              break;
            }
          }
        }
      });

      // Handle ball lives checks
      if (activeBallCount === 0) {
        comboRef.current = 0;
        setCombo(0);
        triggerHaptic(100);
        
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            handleGameOver();
          } else {
            // Respawn ball
            const speed = gamePlayMode === 'challenge' 
              ? activeLevel.ballSpeed 
              : 5.5 + Math.min(4.0, (infiniteWave - 1) * 0.35);

            ballsRef.current = [
              {
                x: GAME_WIDTH / 2,
                y: GAME_HEIGHT - 65,
                vx: (Math.random() > 0.5 ? 1 : -1) * speed * 0.7,
                vy: -speed * 0.9,
                speed: speed,
                active: true,
                trail: []
              }
            ];
            setActivePowerUp(null);
            setPowerupDurationLeft(0);
            isFireballRef.current = false;
            isScoreBoostRef.current = false;
            hasBottomShieldRef.current = false;
            playSound('life');
          }
          return next;
        });
      }

      // Update Power-ups
      const powerUps = powerUpsRef.current;
      powerUps.forEach((pu, idx) => {
        pu.y += pu.vy * delta;

        // Collect powerup
        if (
          pu.y + pu.height >= GAME_HEIGHT - PADDLE_HEIGHT - 8 &&
          pu.y <= GAME_HEIGHT - 8 &&
          pu.x >= pad.x &&
          pu.x <= pad.x + pad.width
        ) {
          applyPowerUp(pu.type);
          powerUps.splice(idx, 1);
          return;
        }

        if (pu.y > GAME_HEIGHT) {
          powerUps.splice(idx, 1);
        }
      });

      // Update Particles
      const particles = particlesRef.current;
      particles.forEach((p, idx) => {
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.alpha -= p.decay * delta;
        if (p.alpha <= 0) {
          particles.splice(idx, 1);
        }
      });

      // Update Debris physical fragments with gravity
      const fragments = fragmentsRef.current;
      fragments.forEach((f, idx) => {
        f.vy += 0.25 * delta; // Gravity physics
        f.x += f.vx * delta;
        f.y += f.vy * delta;
        f.rotation += f.rotVelocity * delta;
        f.alpha -= f.decay * delta;
        if (f.alpha <= 0) {
          fragments.splice(idx, 1);
        }
      });

      // Update Float text popups
      const fTexts = floatTextsRef.current;
      fTexts.forEach((ft, idx) => {
        ft.y -= 1.0 * delta;
        ft.alpha -= 0.024 * delta;
        if (ft.alpha <= 0) {
          fTexts.splice(idx, 1);
        }
      });

      // --- RENDERING CANVAS DRAW CALLS ---
      // Draw Paddle
      ctx.shadowColor = activePowerUp ? '#a855f7' : '#06b6d4';
      ctx.shadowBlur = perfQuality === 'LOW' ? 0 : 12;
      ctx.fillStyle = activePowerUp ? '#a855f7' : '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(pad.x, GAME_HEIGHT - PADDLE_HEIGHT - 8, pad.width, PADDLE_HEIGHT, 8);
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // Draw Bricks 3D
      bricksRef.current.forEach(b => {
        if (b.destroyed) return;
        if (b.hitFlashTime > 0) {
          b.hitFlashTime--;
        }
        drawBrick3D(ctx, b);
      });

      // Draw Ball trails and core sphere
      balls.forEach(ball => {
        if (!ball.active) return;
        
        // Draw trailing buffer shadow paths (Disabled on Low Quality)
        if (perfQuality !== 'LOW') {
          ball.trail.forEach((t, i) => {
            const trailAlpha = (i / ball.trail.length) * 0.22;
            ctx.fillStyle = isFireballRef.current ? `rgba(239, 68, 68, ${trailAlpha})` : `rgba(255, 255, 255, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Core sphere
        ctx.fillStyle = isFireballRef.current ? '#ef4444' : '#ffffff';
        ctx.shadowColor = isFireballRef.current ? '#ef4444' : '#00f0ff';
        ctx.shadowBlur = perfQuality === 'LOW' ? 0 : 16;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Draw falling Power-ups
      powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = perfQuality === 'LOW' ? 0 : 8;
        ctx.beginPath();
        ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type[0], pu.x + pu.width / 2, pu.y + pu.height / 2);
      });

      // Draw debris physical fragments with rotation
      fragments.forEach(f => {
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      });

      // Draw burst particles
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw floating score text pops
      fTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore(); // Camera shake translate restore
      animationIdRef.current = requestAnimationFrame(gameLoop);
    };

    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [screen, activeLevel, playSound, initLevelBricks, initEndlessBricks, gamePlayMode, infiniteWave, perfQuality]);

  const handleVictory = async (bossCompleted = false) => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (infiniteRebuildTimerRef.current) clearInterval(infiniteRebuildTimerRef.current);
    exitFullscreenAndLandscape();
    playSound('victory');
    triggerHaptic(150);

    const currentLvl = activeLevelRef.current;
    const nextLevelId = currentLvl.id + 1;

    // Update local stats state immediately so Next Level unlocks synchronously
    setStats(prev => {
      const completedSet = new Set([...(prev.completedLevels || []), currentLvl.id]);
      const unlockedSet = new Set([...(prev.unlockedLevels || [1]), currentLvl.id]);
      if (currentLvl.id < LEVELS.length) {
        unlockedSet.add(nextLevelId);
      }
      const updated: LocalStats = {
        ...prev,
        completedLevels: Array.from(completedSet),
        unlockedLevels: Array.from(unlockedSet),
        bestScores: { ...prev.bestScores, [currentLvl.id]: Math.max(prev.bestScores?.[currentLvl.id] || 0, score) }
      };
      try {
        localStorage.setItem('smartlearn_breaker_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setScreen('VICTORY');

    // Call submit secure session API on Server
    const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    
    try {
      const res = await fetch('/api/code-arena/game/session/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionIdRef.current,
          score,
          duration,
          combo: maxCombo,
          livesRemaining: lives,
          goldBricksBroken: goldBricksBrokenCount,
          bossKilled: bossCompleted
        })
      });
      const data = await res.json();
      if (data.success) {
        setEarnedStars(data.starsEarned || 1);
        setEarnedXP(data.xpGained || 0);
        setEarnedCoins(data.coinsGained || 0);
        setSessionAchievements(data.newAchievements || []);
        setSessionMilestones(data.newMilestones || []);
        
        // Reconcile server unlocked levels to ensure single source of truth
        if (data.unlockedLevels) {
          setStats(prev => ({
            ...prev,
            completedLevels: Array.from(new Set([...(prev.completedLevels || []), currentLvl.id])),
            unlockedLevels: Array.from(new Set([...(prev.unlockedLevels || []), ...data.unlockedLevels, nextLevelId]))
          }));
        }

        // Refresh profile stats
        fetchProgress();
      }
    } catch (e) {
      console.error('Failed to submit score to Server', e);
      let stars = 1;
      if (score > currentLvl.targetScore * 1.3) stars = 3;
      else if (score > currentLvl.targetScore) stars = 2;
      setEarnedStars(stars);
      setEarnedXP(currentLvl.xpReward);
      setEarnedCoins(15);
    }
  };

  const handleGameOver = async () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (infiniteRebuildTimerRef.current) clearInterval(infiniteRebuildTimerRef.current);
    exitFullscreenAndLandscape();
    playSound('gameover');
    triggerHaptic(200);

    const duration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

    // Call submit session API on Server
    try {
      const res = await fetch('/api/code-arena/game/session/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionIdRef.current,
          score,
          duration,
          wave: gamePlayMode === 'infinite' ? infiniteWave : 1,
          combo: maxCombo,
          livesRemaining: 0,
          goldBricksBroken: goldBricksBrokenCount,
          bossKilled: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setEarnedXP(data.xpGained || 0);
        setEarnedCoins(data.coinsGained || 0);
        setSessionAchievements(data.newAchievements || []);
        setSessionMilestones(data.newMilestones || []);
        
        fetchProgress();
      }
    } catch (e) {
      console.error('Failed to submit failed session to Server', e);
      if (gamePlayMode === 'infinite') {
        const local: LocalStats = {
          ...stats,
          highestWave: Math.max(stats.highestWave || 0, infiniteWave),
          bestInfiniteScore: Math.max(stats.bestInfiniteScore || 0, score)
        };
        setStats(local);
        localStorage.setItem('smartlearn_breaker_stats', JSON.stringify(local));
      }
    }

    if (gamePlayMode === 'infinite') {
      setScreen('INFINITE_VICTORY');
    } else {
      setScreen('GAME_OVER');
    }
  };

  const exitGame = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    if (infiniteRebuildTimerRef.current) clearInterval(infiniteRebuildTimerRef.current);
    exitFullscreenAndLandscape();
    setScreen('LOBBY');
  };

  return (
    <div 
      className="code-arena-page game-shell" 
      ref={containerRef} 
      style={{ 
        background: 'var(--bg-main, #040814)', 
        minHeight: '100dvh', 
        width: '100%',
        maxWidth: '100dvw',
        display: 'flex', 
        flexDirection: 'column', 
        color: '#f8fafc', 
        overflow: 'hidden',
        position: 'fixed',
        inset: 0,
        boxSizing: 'border-box'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .game-shell, .game-shell * {
          box-sizing: border-box !important;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .game-shell ::-webkit-scrollbar {
          display: none !important;
        }
        
        .game-shell {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .pulsing-glow {
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
          animation: pulseGlow 2s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.6); }
          100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.3); }
        }

        @media (max-width: 480px) {
          .game-header-title-text {
            display: none !important;
          }
          .game-header-install-btn {
            display: none !important;
          }
          .game-header-xp-pill {
            padding: 4px 8px !important;
          }
          .game-header-xp-text {
            font-size: 11px !important;
          }
        }
      `}} />

      {/* Device Rotation Overlay Dialog */}
      {showRotationOverlay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7, 10, 20, 0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 1000, padding: '24px', textAlign: 'center' }}>
          <RotateCcw size={48} color="#f97316" style={{ animation: 'spin 4s linear infinite' }} />
          <h3 style={{ fontSize: '22px', fontWeight: 900, margin: 0, color: 'white' }}>ROTATE YOUR DEVICE</h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', maxWidth: '320px', margin: 0 }}>
            Landscape mode offers the best gaming experience. Turn your device horizontally.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button 
              onClick={() => {
                setShowRotationOverlay(false);
                requestFullscreenAndLandscape();
              }}
              style={{ background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Rotate & Play
            </button>
            <button 
              onClick={() => setShowRotationOverlay(false)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Portrait
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navigation Panel */}
      {screen !== 'PLAYING' && screen !== 'PAUSED' && (
        <header className="game-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-divider, #1e293b)', background: 'rgba(7, 10, 20, 0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Link 
              href="/code-arena" 
              onClick={exitFullscreenAndLandscape}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', flexShrink: 0 }}
            >
              <ArrowLeft size={14} /> Exit
            </Link>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 800, color: 'var(--neon-cyan, #06b6d4)', minWidth: 0 }}>
              <Gamepad2 size={16} style={{ flexShrink: 0 }} /> 
              <span className="game-header-title-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arcade: Brick Breaker</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button 
              onClick={() => setScreen(screen === 'LEADERBOARD' ? 'LOBBY' : 'LEADERBOARD')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trophy size={13} color="#facc15" /> Leaderboard
            </button>
            <button 
              onClick={() => setScreen(screen === 'ACHIEVEMENTS' ? 'LOBBY' : 'ACHIEVEMENTS')}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Award size={13} color="#a855f7" /> Badges
            </button>
            
            {pwaInstallSupported && (
              <button 
                onClick={triggerPwaInstall}
                className="game-header-install-btn"
                style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '6px 12px', borderRadius: '14px', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                <Download size={12} /> Install
              </button>
            )}

            <div className="game-header-xp-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '6px 12px', borderRadius: '14px' }}>
              <Zap size={12} color="#a855f7" fill="#a855f7" />
              <span className="game-header-xp-text" style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc' }}>{stats.totalXP} XP</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '6px 12px', borderRadius: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>🪙 {stats.coins}</span>
            </div>
          </div>
        </header>
      )}

      {/* RENDER ACTIVE LOBBY / LEVEL PROGRESSION ROAD */}
      {screen === 'LOBBY' && (
        <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '24px', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(6,182,212,0.2)', padding: '4px 12px', borderRadius: '12px', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: '#22d3ee', textTransform: 'uppercase', marginBottom: '8px' }}>
              GAMIFIED LEARNING ARCADE
            </span>
            <h2 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, background: 'linear-gradient(to right, #00f0ff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 6px 0' }}>Brick Breaker Challenge</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, margin: '0 0 14px 0' }}>
              Defeat bosses, collect falling powers, and conquer the global leaderboards!
            </p>

            {/* Performance Quality Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '240px', margin: '0 auto' }}>
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map(quality => (
                <button
                  key={quality}
                  onClick={() => setPerfQuality(quality)}
                  style={{
                    flex: 1,
                    background: perfQuality === quality ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: perfQuality === quality ? '#00f0ff' : '#64748b',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          {/* Endless Mode Promo Panel */}
          <div 
            onClick={selectInfiniteForPlay}
            className="pulsing-glow"
            style={{ 
              width: '100%', 
              maxWidth: '540px', 
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(168, 85, 247, 0.12))', 
              border: '1px solid rgba(6, 182, 212, 0.35)', 
              borderRadius: '16px', 
              padding: '16px 20px', 
              marginBottom: '20px', 
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: '#00f0ff', fontWeight: 800, letterSpacing: '1px' }}>♾️ INFINITE ENDLESS MODE</span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '17px', fontWeight: 900, color: 'white' }}>Survival Wave Rebuilder</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Best Score: {stats.bestInfiniteScore} • Max Wave: {stats.highestWave}</p>
            </div>
            <Play size={20} fill="#00f0ff" color="#00f0ff" />
          </div>

          <div style={{ width: '100%', textAlign: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, letterSpacing: '1px' }}>CHALLENGE STAGES</span>
          </div>

          {/* Level List - Path Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '540px', position: 'relative', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box', paddingBottom: '30px' }}>
            
            {/* Connection Line */}
            <div style={{ position: 'absolute', left: '30px', top: '20px', bottom: '20px', width: '2px', background: 'linear-gradient(180deg, #06b6d4, #a855f7)', opacity: 0.3, zIndex: 1 }} />

            {LEVELS.map((level, idx) => {
              const isFirst = idx === 0;
              const isCompleted = stats.completedLevels?.includes(level.id);
              const isLocked = !isFirst && !stats.unlockedLevels?.includes(level.id);
              const isActive = !isLocked && !isCompleted;
              const levelStars = stats.stars?.[level.id] || 0;
              const bestScore = stats.bestScores?.[level.id] || 0;
              const isBoss = level.id % 5 === 0;

              return (
                <div 
                  key={level.id}
                  onClick={() => !isLocked && selectLevelForPlay(level)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: isLocked ? 'rgba(30, 41, 59, 0.2)' : isActive ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isLocked ? '1px solid rgba(255,255,255,0.03)' : isActive ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 2,
                    boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.12)' : 'none',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'grid',
                    placeItems: 'center',
                    background: isLocked ? '#1e293b' : isBoss ? 'linear-gradient(135deg, #f43f5e, #be123c)' : isCompleted ? '#10b981' : 'linear-gradient(135deg, #06b6d4, #a855f7)',
                    flexShrink: 0
                  }}>
                    {isLocked ? <Lock size={14} color="#64748b" /> : isBoss ? <span style={{ fontSize: '13px' }}>👑</span> : isCompleted ? <CheckCircle2 size={14} color="white" /> : <Play size={14} color="white" fill="white" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: isLocked ? '#64748b' : isBoss ? '#f43f5e' : 'var(--neon-cyan)' }}>
                        {isBoss ? '👑 BOSS ' : ''}LVL {level.id.toString().padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '9px', background: level.difficulty === 'Easy' ? 'rgba(16,185,129,0.1)' : level.difficulty === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: level.difficulty === 'Easy' ? '1px solid rgba(16,185,129,0.2)' : level.difficulty === 'Medium' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(239,68,68,0.2)', padding: '1px 6px', borderRadius: '6px', color: level.difficulty === 'Easy' ? '#34d399' : level.difficulty === 'Medium' ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
                        {level.difficulty}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px', color: isLocked ? '#94a3b8' : 'white' }}>
                      {level.title}
                    </div>
                  </div>

                  {!isLocked && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {[1, 2, 3].map(starIndex => (
                          <Star 
                            key={starIndex} 
                            size={12} 
                            fill={starIndex <= levelStars ? '#facc15' : 'transparent'} 
                            color={starIndex <= levelStars ? '#eab308' : 'rgba(255,255,255,0.15)'} 
                          />
                        ))}
                      </div>
                      {bestScore > 0 && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Best: {bestScore}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER LEVEL PREVIEW SCREEN */}
      {screen === 'PREVIEW' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', width: '100%', minHeight: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            <span style={{ color: 'var(--neon-cyan)', fontSize: '11px', fontWeight: 800, letterSpacing: '2px' }}>
              {gamePlayMode === 'challenge' ? 'LEVEL PREVIEW' : 'INFINITE RUN PREVIEW'}
            </span>
            
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: gamePlayMode === 'challenge' && activeLevel.id % 5 === 0 ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'linear-gradient(135deg, #06b6d4, #a855f7)',
              display: 'grid',
              placeItems: 'center',
              margin: '14px auto 10px auto',
              boxShadow: '0 0 15px rgba(6,182,212,0.2)',
              flexShrink: 0
            }}>
              <Gamepad2 size={22} color="white" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 950, margin: '0 0 4px 0', color: 'white' }}>
              {gamePlayMode === 'challenge' ? `Level ${activeLevel.id}: ${activeLevel.title}` : 'Endless Rebuilder'}
            </h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {gamePlayMode === 'challenge' ? `Target score: ${activeLevel.targetScore} points` : 'Survive brick rebuild timers!'}
            </span>

            {/* Portrait game preview visual graphic */}
            <div style={{ 
              margin: '14px auto', 
              padding: '12px', 
              background: 'rgba(6, 9, 19, 0.6)', 
              border: '1px dashed rgba(6, 182, 212, 0.4)', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '8px',
              maxWidth: '260px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>GAMEPLAY PREVIEW</div>
              {/* Brick rows */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', width: '100%', justifyContent: 'center' }}>
                {gamePlayMode === 'challenge' ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ width: '32px', height: '8px', borderRadius: '2px', background: activeLevel.brickColors[i % activeLevel.brickColors.length] || '#06b6d4', opacity: 0.85 }} />
                  ))
                ) : (
                  Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ width: '32px', height: '8px', borderRadius: '2px', background: i % 2 === 0 ? '#ec4899' : '#06b6d4', opacity: 0.85 }} />
                  ))
                )}
              </div>
              {/* Ball & Paddle */}
              <div style={{ position: 'relative', width: '100%', height: '40px', marginTop: '6px' }}>
                <div style={{ position: 'absolute', left: '55%', top: '25%', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #00f0ff' }} />
                <div style={{ position: 'absolute', left: '35%', bottom: '5px', width: '50px', height: '6px', borderRadius: '3px', background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.2' }}>
                Landscape gameplay activates on start
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>DIFFICULTY</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>
                  {gamePlayMode === 'challenge' ? activeLevel.difficulty : 'Scaling'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>BASE REWARD</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <Zap size={11} color="#10b981" fill="#10b981" /> 
                  {gamePlayMode === 'challenge' ? `+${activeLevel.xpReward} XP` : '2 XP / wave'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => startGame()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: gamePlayMode === 'challenge' && activeLevel.id % 5 === 0 ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'linear-gradient(135deg, #00f0ff, #3b82f6)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0,240,255,0.25)',
                }}
              >
                START GAME
              </button>
              
              <button 
                onClick={() => setScreen('LOBBY')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER GAMEPLAY CANVAS CONTAINER */}
      {(screen === 'PLAYING' || screen === 'PAUSED') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box' }}>
          
          {/* HUD Layer Overlay Panel */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            width: 'calc(100% - 16px)', 
            maxWidth: '1200px', 
            position: 'absolute', 
            top: '8px', 
            background: 'rgba(7, 10, 20, 0.65)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            padding: '4px 12px', 
            borderRadius: '8px', 
            zIndex: 10,
            backdropFilter: 'blur(6px)',
            boxSizing: 'border-box'
          }}>
            
            {/* Lives counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800 }}>LIVES</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Heart 
                    key={idx}
                    size={14}
                    fill={idx < lives ? '#ef4444' : 'transparent'}
                    color={idx < lives ? '#ef4444' : 'rgba(255,255,255,0.1)'}
                    style={{ display: idx < lives || idx < 3 ? 'block' : 'none' }}
                  />
                ))}
              </div>
            </div>
 
            {/* Score & Combo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '8px', color: '#94a3b8', fontWeight: 800 }}>SCORE</span>
                <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--neon-cyan, #06b6d4)' }}>{score}</span>
              </div>
              
              {combo > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', padding: '2px 6px', borderRadius: '6px' }}>
                  <Flame size={10} color="#f97316" fill="#f97316" />
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#fdba74' }}>x{combo}</span>
                </div>
              )}
            </div>

            {/* Rebuild Countdowns for Infinite mode */}
            {gamePlayMode === 'infinite' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#c084fc' }}>WAVE {infiniteWave}</span>
                <span style={{ fontSize: '10px', color: '#e9d5ff', fontWeight: 800 }}>REBUILD: {rebuildCountdown}s</span>
              </div>
            )}

            {/* Boss healthbar indicator */}
            {gamePlayMode === 'challenge' && activeLevel.id % 5 === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '120px', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 800, color: '#f43f5e' }}>
                  <span>BOSS CORE</span>
                  <span>{bossHealth} / {maxBossHealth} HP</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(244, 63, 94, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(bossHealth / maxBossHealth) * 100}%`, height: '100%', background: '#f43f5e', transition: 'width 0.1s ease' }} />
                </div>
              </div>
            )}
 
            {/* Level & Settings Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900 }}>
                {gamePlayMode === 'challenge' ? `LVL ${activeLevel.id}` : '♾️ ENDLESS'}
              </span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  style={{ background: 'none', border: 'none', color: musicEnabled ? 'var(--neon-cyan)' : '#64748b', cursor: 'pointer', padding: 2 }}
                >
                  {musicEnabled ? <Music size={14} /> : <Music2 size={14} />}
                </button>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{ background: 'none', border: 'none', color: soundEnabled ? 'var(--neon-cyan)' : '#64748b', cursor: 'pointer', padding: 2 }}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button 
                  onClick={() => setScreen(screen === 'PLAYING' ? 'PAUSED' : 'PLAYING')}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 2 }}
                >
                  {screen === 'PLAYING' ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>
          </div>
  
          {/* Fully Immersive Gameplay Canvas Layer (Preserving Aspect Ratio) */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden', 
            background: '#060913',
            boxSizing: 'border-box'
          }}>
            
            {/* Live game FPS counter (development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', color: '#10b981', zIndex: 10 }}>
                FPS: {fps} | Quality: {perfQuality}
              </div>
            )}

            {/* Boss Intro Animation layer */}
            {showBossIntro && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 10, 20, 0.4)', zIndex: 9, pointerEvents: 'none', animation: 'pulseGlow 1.2s infinite' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#f43f5e', letterSpacing: '3px' }}>⚠️ BOSS LEVEL WARNING ⚠️</span>
                <h1 style={{ fontSize: '28px', fontWeight: 950, color: 'white', margin: '4px 0', textShadow: '0 0 10px #f43f5e' }}>THE BRICK GUARDIAN</h1>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Destroy the core. Survive the arena.</span>
              </div>
            )}

            {/* Bottom active powerup timer bar */}
            {activePowerUp && (
              <div style={{ position: 'absolute', bottom: '12px', width: '220px', background: 'rgba(7, 10, 20, 0.7)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '6px', zIndex: 9, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800, color: '#00f0ff' }}>
                  <span>{activePowerUp.replace('_', ' ')}</span>
                  <span>ACTIVE</span>
                </div>
                <div style={{ width: '100%', height: '3px', background: 'rgba(0, 240, 255, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${powerupDurationLeft}%`, height: '100%', background: '#00f0ff' }} />
                </div>
              </div>
            )}
 
            <canvas 
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              onPointerMove={handlePointerMove}
              style={{ 
                display: 'block', 
                width: '100%', 
                height: '100%', 
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: '16/9',
                objectFit: 'contain',
                margin: 'auto',
                cursor: 'none',
                touchAction: 'none', 
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            />
 
            {/* Active Pause Menu Overlay */}
            {screen === 'PAUSED' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7, 10, 20, 0.8)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 20 }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px', width: 'min(92%, 360px)', textAlign: 'center', boxSizing: 'border-box', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, color: 'var(--neon-cyan)', marginBottom: '10px' }}>
                    GAME PAUSED
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 16px 0', color: 'white' }}>Smart Arcade</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => setScreen('PLAYING')}
                      style={{ width: '100%', background: 'linear-gradient(135deg, #00f0ff, #3b82f6)', border: 'none', color: 'white', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Resume Game
                    </button>
                    <button 
                      onClick={() => startGame()}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Restart Game
                    </button>
                    <button 
                      onClick={exitGame}
                      style={{ width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Exit to Lobby
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VICTORY SCREEN */}
      {screen === 'VICTORY' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
              {[1, 2, 3].map(idx => (
                <Star 
                  key={idx}
                  size={24}
                  fill={idx <= earnedStars ? '#facc15' : 'transparent'}
                  color={idx <= earnedStars ? '#eab308' : 'rgba(255,255,255,0.1)'}
                />
              ))}
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', margin: '0 0 4px 0' }}>LEVEL COMPLETE!</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Excellent reflection angles!</span>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Score</span>
                <span style={{ fontWeight: 800, color: 'var(--neon-cyan)' }}>{score} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Best Combo</span>
                <span style={{ fontWeight: 800, color: '#f97316' }}>{maxCombo}x blocks</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ color: '#64748b' }}>XP Gained</span>
                <span style={{ fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Zap size={11} color="#a855f7" fill="#a855f7" /> +{earnedXP} XP
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Coins Earned</span>
                <span style={{ fontWeight: 800, color: '#fbbf24' }}>🪙 +{earnedCoins} Coins</span>
              </div>
            </div>

            {sessionAchievements.length > 0 && (
              <div style={{ marginBottom: '14px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '8px 10px', borderRadius: '10px', textAlign: 'left' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#c084fc', display: 'block', marginBottom: '4px' }}>🏆 ACHIEVEMENTS UNLOCKED!</span>
                {sessionAchievements.map((ach, i) => (
                  <div key={i} style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>• {ach.replace('_', ' ').toUpperCase()}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeLevelRef.current.id < LEVELS.length ? (
                <button 
                  onClick={() => {
                    const nextId = activeLevelRef.current.id + 1;
                    const next = LEVELS.find(l => l.id === nextId);
                    if (next) {
                      selectLevelForPlay(next);
                      startGame(next);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(16,185,129,0.25)',
                  }}
                >
                  NEXT LEVEL ({activeLevelRef.current.id + 1})
                </button>
              ) : (
                <div style={{ color: '#facc15', fontWeight: 800, fontSize: '14px', marginBottom: '8px' }}>
                  🏆 ALL LEVELS COMPLETED!
                </div>
              )}

              <button 
                onClick={() => startGame()}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Replay Level
              </button>

              <button 
                onClick={exitGame}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--neon-cyan)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER GAME OVER SCREEN */}
      {screen === 'GAME_OVER' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#ef4444', margin: '0 0 4px 0' }}>GAME OVER</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0' }}>Keep practicing, you will clear the blocks next time!</p>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Your Score</span>
                <span style={{ fontWeight: 800, color: '#f87171' }}>{score} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Target Goal</span>
                <span style={{ fontWeight: 800, color: 'white' }}>{activeLevel.targetScore} pts</span>
              </div>
              {earnedXP > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                  <span style={{ color: '#64748b' }}>XP Reward</span>
                  <span style={{ fontWeight: 800, color: '#c084fc' }}>+{earnedXP} XP</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => startGame()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(239,68,68,0.25)',
                }}
              >
                TRY AGAIN
              </button>

              <button 
                onClick={exitGame}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER INFINITE MODE END-RUN SCREEN */}
      {screen === 'INFINITE_VICTORY' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trophy size={28} color="#a855f7" />
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#c084fc', margin: '0 0 4px 0' }}>♾️ RUN COMPLETE</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Excellent endless run!</span>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Wave Reached</span>
                <span style={{ fontWeight: 800, color: '#a855f7' }}>Wave {infiniteWave}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Final Score</span>
                <span style={{ fontWeight: 800, color: 'var(--neon-cyan)' }}>{score} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Best Combo</span>
                <span style={{ fontWeight: 800, color: '#f97316' }}>{maxCombo}x blocks</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ color: '#64748b' }}>XP Award</span>
                <span style={{ fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Zap size={11} color="#a855f7" fill="#a855f7" /> +{earnedXP} XP
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b' }}>Coins Earned</span>
                <span style={{ fontWeight: 800, color: '#fbbf24' }}>🪙 +{earnedCoins} Coins</span>
              </div>
            </div>

            {sessionMilestones.length > 0 && (
              <div style={{ marginBottom: '14px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.25)', padding: '8px 10px', borderRadius: '10px', textAlign: 'left' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#00f0ff', display: 'block', marginBottom: '4px' }}>⚡ MILESTONES REACHED!</span>
                {sessionMilestones.map((ms, i) => (
                  <div key={i} style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>• {ms.replace('_', ' ').toUpperCase()}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => startGame()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00f0ff, #3b82f6)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(0,240,255,0.25)',
                }}
              >
                PLAY AGAIN
              </button>

              <button 
                onClick={exitGame}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD SCREEN OVERLAY */}
      {screen === 'LEADERBOARD' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '20px', maxWidth: '500px', width: '100%', boxSizing: 'border-box', backdropFilter: 'blur(20px)' }}>
            
            <h3 style={{ fontSize: '20px', fontWeight: 950, color: 'white', margin: '0 0 12px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Trophy size={20} color="#facc15" /> Global Leaderboards
            </h3>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setLeaderboardModeFilter('challenge')}
                style={{ flex: 1, background: leaderboardModeFilter === 'challenge' ? 'rgba(6, 182, 212, 0.15)' : 'transparent', border: 'none', borderRadius: '6px', color: leaderboardModeFilter === 'challenge' ? '#00f0ff' : '#94a3b8', padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Challenge Mode
              </button>
              <button
                onClick={() => setLeaderboardModeFilter('infinite')}
                style={{ flex: 1, background: leaderboardModeFilter === 'infinite' ? 'rgba(6, 182, 212, 0.15)' : 'transparent', border: 'none', borderRadius: '6px', color: leaderboardModeFilter === 'infinite' ? '#00f0ff' : '#94a3b8', padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Endless Mode
              </button>
            </div>

            {/* Daily/Weekly/All-Time tabs */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '14px' }}>
              {(['daily', 'weekly', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeaderboardTab(tab)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: leaderboardTab === tab ? '2px solid #a855f7' : 'none',
                    color: leaderboardTab === tab ? '#c084fc' : '#64748b',
                    fontWeight: 800,
                    fontSize: '11px',
                    padding: '6px 0',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Rank List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
              {loadingLeaderboard ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>Loading rankings...</div>
              ) : leaderboardEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px' }}>No entries found for this period.</div>
              ) : (
                leaderboardEntries.map((entry) => (
                  <div 
                    key={entry.user_id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      padding: '8px 12px', 
                      borderRadius: '10px' 
                    }}
                  >
                    <span style={{ 
                      width: '24px', 
                      fontSize: '11px', 
                      fontWeight: 900, 
                      color: entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#cbd5e1' : entry.rank === 3 ? '#b45309' : '#64748b',
                      textAlign: 'center'
                    }}>
                      #{entry.rank}
                    </span>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '10px',
                      overflow: 'hidden'
                    }}>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        entry.name[0]
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                      {entry.score} pts
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Current user rank summary panel */}
            {userRank && (
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc' }}>YOUR RANKING</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: 'white' }}>Rank #{userRank.rank} ({userRank.score} pts)</span>
              </div>
            )}

            <button 
              onClick={() => setScreen('LOBBY')}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* BADGES & ACHIEVEMENTS SCREEN */}
      {screen === 'ACHIEVEMENTS' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '20px', maxWidth: '500px', width: '100%', boxSizing: 'border-box', backdropFilter: 'blur(20px)' }}>
            
            <h3 style={{ fontSize: '19px', fontWeight: 950, color: 'white', margin: '0 0 14px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Award size={20} color="#c084fc" /> Arcade Achievements
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {[
                { id: 'first_break', title: 'First Break', desc: 'Destroy your first brick', icon: '🧱' },
                { id: 'combo_master', title: 'Combo Master', desc: 'Reach x10 combo multiplier', icon: '🔥' },
                { id: 'boss_slayer', title: 'Boss Slayer', desc: 'Defeat a guardian brick core', icon: '👑' },
                { id: 'endless_runner', title: 'Endless Runner', desc: 'Reach Wave 25 in Endless mode', icon: '♾️' },
                { id: 'gold_hunter', title: 'Gold Hunter', desc: 'Destroy 25 golden bricks', icon: '✨' },
                { id: 'perfect_run', title: 'Perfect Run', desc: 'Complete a level without losing a heart', icon: '❤️' },
                { id: 'champion', title: 'Champion', desc: 'Complete all 10 challenge stages', icon: '🏆' }
              ].map(ach => {
                const isUnlocked = stats.achievements?.includes(ach.id);
                return (
                  <div 
                    key={ach.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      background: isUnlocked ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.01)', 
                      border: isUnlocked ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(255,255,255,0.04)', 
                      padding: '10px 14px', 
                      borderRadius: '12px',
                      opacity: isUnlocked ? 1 : 0.5
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{ach.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'block' }}>{ach.title}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ach.desc}</span>
                    </div>
                    {isUnlocked ? (
                      <span style={{ fontSize: '9px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: '8px', fontWeight: 800 }}>UNLOCKED</span>
                    ) : (
                      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '8px', fontWeight: 800 }}>LOCKED</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => setScreen('LOBBY')}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Footer Quote */}
      {screen !== 'PLAYING' && screen !== 'PAUSED' && (
        <footer style={{ textAlign: 'center', padding: '16px 20px', fontSize: '10px', color: '#475569', borderTop: '1px solid rgba(255, 255, 255, 0.02)', flexShrink: 0 }}>
          <span>Smart Learn Brick Breaker Challenge • Retro Arcade Engine v3.0 • 60 FPS Secure Canvas Physics</span>
        </footer>
      )}
    </div>
  );
}
