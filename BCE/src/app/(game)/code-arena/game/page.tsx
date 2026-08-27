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
  Download
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
  { id: 1, title: 'Warm Up', difficulty: 'Easy', ballSpeed: 6.0, paddleWidth: 190, rows: 3, cols: 6, lives: 3, xpReward: 20, targetScore: 1000, brickColors: ['#a855f7', '#6366f1', '#06b6d4'] },
  { id: 2, title: 'First Challenge', difficulty: 'Easy', ballSpeed: 6.5, paddleWidth: 180, rows: 3, cols: 8, lives: 3, xpReward: 25, targetScore: 1800, brickColors: ['#a855f7', '#3b82f6', '#06b6d4'] },
  { id: 3, title: 'Speed Run', difficulty: 'Medium', ballSpeed: 7.5, paddleWidth: 170, rows: 4, cols: 8, lives: 3, xpReward: 35, targetScore: 3000, brickColors: ['#ec4899', '#a855f7', '#6366f1', '#3b82f6'] },
  { id: 4, title: 'Double Trouble', difficulty: 'Medium', ballSpeed: 8.0, paddleWidth: 160, rows: 4, cols: 9, lives: 3, xpReward: 40, targetScore: 4000, brickColors: ['#ef4444', '#ec4899', '#3b82f6', '#06b6d4'] },
  { id: 5, title: 'Power Zone', difficulty: 'Hard', ballSpeed: 8.5, paddleWidth: 150, rows: 5, cols: 9, lives: 3, xpReward: 50, targetScore: 5000, brickColors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'] },
  { id: 6, title: 'Precision Blockade', difficulty: 'Hard', ballSpeed: 9.0, paddleWidth: 140, rows: 5, cols: 10, lives: 3, xpReward: 60, targetScore: 6500, brickColors: ['#f43f5e', '#a855f7', '#10b981', '#3b82f6', '#facc15'] },
  { id: 7, title: 'Chaos Moving', difficulty: 'Expert', ballSpeed: 9.5, paddleWidth: 130, rows: 6, cols: 10, lives: 3, xpReward: 70, targetScore: 8000, brickColors: ['#ec4899', '#f43f5e', '#ef4444', '#10b981', '#6366f1', '#06b6d4'] },
  { id: 8, title: 'Expert Arena', difficulty: 'Expert', ballSpeed: 10.0, paddleWidth: 120, rows: 6, cols: 11, lives: 2, xpReward: 85, targetScore: 10000, brickColors: ['#ef4444', '#f59e0b', '#3b82f6', '#a855f7', '#06b6d4', '#4ade80'] },
  { id: 9, title: 'Master Mind', difficulty: 'Master', ballSpeed: 10.5, paddleWidth: 110, rows: 7, cols: 11, lives: 2, xpReward: 100, targetScore: 12000, brickColors: ['#ef4444', '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4'] },
  { id: 10, title: 'Smart Learn Champion', difficulty: 'Legend', ballSpeed: 11.0, paddleWidth: 100, rows: 7, cols: 12, lives: 2, xpReward: 150, targetScore: 15000, brickColors: ['#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'] },
];

// --- VIRTUAL GAME RESOLUTION ---
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const PADDLE_HEIGHT = 22;
const BALL_RADIUS = 10;
const BRICK_PADDING = 12;
const BRICK_TOP_OFFSET = 90;
const BRICK_HEIGHT = 34;

const MAX_PARTICLES = 80;
const MAX_FRAGMENTS = 100;

type GameScreen = 'LOBBY' | 'PREVIEW' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';
type PowerUpType = 'WIDE_PADDLE' | 'MULTI_BALL' | 'FIRE_BALL' | 'EXTRA_LIFE' | 'SLOW_MOTION' | 'SCORE_BOOST';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  durability: number;
  maxDurability: number;
  isSpecial: boolean;
  scoreValue: number;
  destroyed: boolean;
  hitFlashTime: number; // impact flash timer in frames
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
  bestScores: Record<number, number>;
  stars: Record<number, number>;
  totalXP: number;
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
  
  // Settings, Installation, & Responsive Orientation
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [showRotationOverlay, setShowRotationOverlay] = useState<boolean>(false);
  const [pwaInstallSupported, setPwaInstallSupported] = useState<boolean>(false);
  
  // FPS Monitor
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);

  // Progression Storage
  const [stats, setStats] = useState<LocalStats>({
    completedLevels: [],
    bestScores: {},
    stars: {},
    totalXP: 0
  });

  const [earnedStars, setEarnedStars] = useState<number>(0);
  const [earnedXP, setEarnedXP] = useState<number>(0);

  // References for rendering and game loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bgmStepRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);

  // Live Game Engine Refs (bypassing React re-renders for 60fps physics)
  const paddleRef = useRef({ x: 540, targetX: 540, width: 190, targetWidth: 190, speed: 12.0 });
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const fragmentsRef = useRef<BrickFragment[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const shakeTimerRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  
  // Powerup timers
  const powerupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFireballRef = useRef<boolean>(false);
  const isScoreBoostRef = useRef<boolean>(false);

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

  const playSound = useCallback((type: 'bounce' | 'brick' | 'powerup' | 'life' | 'gameover' | 'victory') => {
    if (!soundEnabled) return;
    const ctx = initAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.2, now);
    masterGain.connect(ctx.destination);

    if (type === 'bounce') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'brick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'powerup') {
      const notes = [330, 440, 554, 660];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.25, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.1);
      });
    } else if (type === 'life') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.25);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'gameover') {
      [220, 196, 174, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.35, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.2);
      });
    } else if (type === 'victory') {
      [523, 659, 783, 1046].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.4, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
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
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.18);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
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

  // Load stats
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('smartlearn_breaker_stats');
      if (savedStats) setStats(JSON.parse(savedStats));
    } catch {}
  }, []);

  const saveStats = (newStats: LocalStats) => {
    setStats(newStats);
    try {
      localStorage.setItem('smartlearn_breaker_stats', JSON.stringify(newStats));
    } catch {}
  };

  // Initialize Bricks matching visual materials configurations
  const initLevelBricks = useCallback((level: GameLevel) => {
    const bricks: Brick[] = [];
    const cols = level.cols;
    const rows = level.rows;
    const totalPaddingX = BRICK_PADDING * (cols + 1);
    const brickWidth = (GAME_WIDTH - totalPaddingX) / cols;

    const materials = [
      { color: '#ef4444', durability: 3, score: 300, label: 'Red Brick (Strong)' },
      { color: '#a855f7', durability: 2, score: 200, label: 'Purple Brick (High-value)' },
      { color: '#3b82f6', durability: 1, score: 100, label: 'Blue Brick (Normal)' },
      { color: '#06b6d4', durability: 1, score: 150, label: 'Cyan Brick (Bonus)' },
      { color: '#eab308', durability: 1, score: 500, label: 'Gold Brick (Reward)' }
    ];

    for (let r = 0; r < rows; r++) {
      // Top rows get stronger bricks
      let mat = materials[2]; // Blue (default)
      if (r === 0) {
        mat = materials[0]; // Red
      } else if (r === 1) {
        mat = materials[1]; // Purple
      } else if (r === 2 && cols > 6) {
        mat = Math.random() > 0.5 ? materials[3] : materials[4]; // Cyan or Gold
      }

      for (let c = 0; c < cols; c++) {
        // Random unbreakable slate bricks in hard levels
        const isDarkUnbreakable = (level.difficulty === 'Expert' || level.difficulty === 'Master' || level.difficulty === 'Legend') &&
                                   r === 0 && (c === 2 || c === cols - 3);

        const color = isDarkUnbreakable ? '#334155' : mat.color;
        const durability = isDarkUnbreakable ? 999 : mat.durability;
        const maxDurability = isDarkUnbreakable ? 999 : mat.durability;
        const isSpecial = !isDarkUnbreakable && mat.color === '#eab308';

        bricks.push({
          x: BRICK_PADDING + c * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          height: BRICK_HEIGHT,
          color,
          durability,
          maxDurability,
          isSpecial,
          scoreValue: isSpecial ? 500 : mat.score,
          destroyed: false,
          hitFlashTime: 0
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const selectLevelForPlay = (level: GameLevel) => {
    setActiveLevel(level);
    setScreen('PREVIEW');
  };

  const startGame = () => {
    initLevelBricks(activeLevel);
    
    // Set paddle virtual coordinates
    paddleRef.current = {
      x: (GAME_WIDTH - activeLevel.paddleWidth) / 2,
      targetX: (GAME_WIDTH - activeLevel.paddleWidth) / 2,
      width: activeLevel.paddleWidth,
      targetWidth: activeLevel.paddleWidth,
      speed: 12.0
    };
    
    // Set ball coordinates and clear trail
    ballsRef.current = [
      {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT - 55,
        vx: (Math.random() > 0.5 ? 1 : -1) * activeLevel.ballSpeed,
        vy: -activeLevel.ballSpeed,
        speed: activeLevel.ballSpeed,
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
    setLives(activeLevel.lives);
    setActivePowerUp(null);
    isFireballRef.current = false;
    isScoreBoostRef.current = false;
    
    if (powerupTimerRef.current) clearInterval(powerupTimerRef.current);

    requestFullscreenAndLandscape();
    
    setScreen('PLAYING');
    initAudio();
  };

  const triggerBurst = (x: number, y: number, color: string, count = 12) => {
    const list = particlesRef.current;
    if (list.length > MAX_PARTICLES) {
      list.splice(0, count);
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      list.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  };

  // Fragment burst splits brick physically
  const triggerFragments = (bx: number, by: number, bw: number, bh: number, color: string) => {
    const list = fragmentsRef.current;
    const rows = 2;
    const cols = 4;
    const fragW = bw / cols;
    const fragH = bh / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (list.length >= MAX_FRAGMENTS) {
          list.shift(); // Evict oldest to keep FPS high
        }

        const fx = bx + c * fragW + fragW / 2;
        const fy = by + r * fragH + fragH / 2;

        const centerX = bx + bw / 2;
        const centerY = by + bh / 2;
        const angle = Math.atan2(fy - centerY, fx - centerX) + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 4 + 3;

        list.push({
          x: fx,
          y: fy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2 + 2), // initial vertical pop
          rotation: Math.random() * Math.PI * 2,
          rotVelocity: (Math.random() - 0.5) * 0.25,
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

  const maybeSpawnPowerUp = (x: number, y: number) => {
    if (Math.random() > 0.7) {
      const types: PowerUpType[] = ['WIDE_PADDLE', 'MULTI_BALL', 'FIRE_BALL', 'EXTRA_LIFE', 'SLOW_MOTION', 'SCORE_BOOST'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const colors: Record<PowerUpType, string> = {
        WIDE_PADDLE: '#06b6d4',
        MULTI_BALL: '#a855f7',
        FIRE_BALL: '#f97316',
        EXTRA_LIFE: '#10b981',
        SLOW_MOTION: '#3b82f6',
        SCORE_BOOST: '#facc15'
      };

      powerUpsRef.current.push({
        x,
        y,
        vy: 3.5, 
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
    
    spawnFloatText(type.replace('_', ' '), paddleRef.current.x + paddleRef.current.width / 2, GAME_HEIGHT - 75, '#3b82f6');

    if (type === 'EXTRA_LIFE') {
      setLives(prev => Math.min(6, prev + 1));
    } else if (type === 'WIDE_PADDLE') {
      paddleRef.current.targetWidth = activeLevel.paddleWidth * 1.5;
      startPowerupTimer(6000, () => {
        paddleRef.current.targetWidth = activeLevel.paddleWidth;
      });
    } else if (type === 'SLOW_MOTION') {
      ballsRef.current.forEach(b => {
        b.vx *= 0.65;
        b.vy *= 0.65;
      });
      startPowerupTimer(6000, () => {
        ballsRef.current.forEach(b => {
          b.vx /= 0.65;
          b.vy /= 0.65;
        });
      });
    } else if (type === 'FIRE_BALL') {
      isFireballRef.current = true;
      startPowerupTimer(7500, () => {
        isFireballRef.current = false;
      });
    } else if (type === 'SCORE_BOOST') {
      isScoreBoostRef.current = true;
      startPowerupTimer(8000, () => {
        isScoreBoostRef.current = false;
      });
    } else if (type === 'MULTI_BALL') {
      const active = ballsRef.current.filter(b => b.active);
      if (active.length > 0) {
        const base = active[0];
        const newBalls = [
          { x: base.x, y: base.y, vx: base.vx * 0.9 + 2, vy: base.vy * 0.9, speed: base.speed, active: true, trail: [] },
          { x: base.x, y: base.y, vx: base.vx * 0.9 - 2, vy: base.vy * 0.9, speed: base.speed, active: true, trail: [] }
        ];
        ballsRef.current.push(...newBalls);
      }
    }
  };

  const startPowerupTimer = (duration: number, onEnd: () => void) => {
    if (powerupTimerRef.current) clearTimeout(powerupTimerRef.current);
    powerupTimerRef.current = setTimeout(() => {
      onEnd();
      setActivePowerUp(null);
    }, duration);
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

  // Pointer position mapper
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || screen !== 'PLAYING') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    
    const canvasX = (relativeX * GAME_WIDTH) / rect.width;
    const newTarget = canvasX - paddleRef.current.width / 2;
    paddleRef.current.targetX = Math.max(0, Math.min(GAME_WIDTH - paddleRef.current.width, newTarget));
  };

  // Draw 3D Brick bevel borders
  const drawBrick3D = (ctx: CanvasRenderingContext2D, b: Brick) => {
    const x = b.x;
    const y = b.y;
    const w = b.width;
    const h = b.height;
    
    // Draw brick shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 5, y + 5, w, h);

    // Draw base face
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, w, h);

    // If hit flash is active
    if (b.hitFlashTime > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
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

    // Inner highlight border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // Render cracks based on durability damage ratio
    if (b.durability < b.maxDurability && b.maxDurability > 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      const cx = x + w / 2;
      const cy = y + h / 2;

      // Crack lines branching from center
      ctx.moveTo(cx, cy);
      ctx.lineTo(x + w * 0.25, y + h * 0.2);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x + w * 0.75, y + h * 0.85);

      if (b.durability === 1 && b.maxDurability === 3) {
        // Additional extensive cracking
        ctx.moveTo(cx, cy);
        ctx.lineTo(x + w * 0.8, y + h * 0.15);
        ctx.moveTo(cx, cy);
        ctx.lineTo(x + w * 0.15, y + h * 0.75);
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
      const delta = Math.min((timestamp - previousTimestamp) / 16.666, 2.0); // Capped frame delta
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
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
      }

      // Background Slate color
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw cyber Grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.02)';
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

      // Move Paddle
      const pad = paddleRef.current;
      if (keysRef.current.left) {
        pad.targetX = Math.max(0, pad.targetX - pad.speed * delta);
      }
      if (keysRef.current.right) {
        pad.targetX = Math.min(GAME_WIDTH - pad.width, pad.targetX + pad.speed * delta);
      }
      
      pad.width += (pad.targetWidth - pad.width) * 0.1 * delta;
      pad.x += (pad.targetX - pad.x) * 0.22 * delta; 

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

        ball.x += ball.vx * delta;
        ball.y += ball.vy * delta;

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

        // Collision: Bottom wall (out of bounds)
        if (ball.y + BALL_RADIUS >= GAME_HEIGHT) {
          ball.active = false;
          triggerBurst(ball.x, GAME_HEIGHT - 12, '#ef4444', 8);
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
          const maxAngle = Math.PI / 2.8;
          const bounceAngle = relativeHit * maxAngle;
          
          ball.vx = ball.speed * Math.sin(bounceAngle);
          ball.vy = -ball.speed * Math.cos(bounceAngle);
          
          playSound('bounce');
          triggerHaptic(20);
        }

        // Collision: Bricks
        const bricks = bricksRef.current;
        let activeBricksLeft = 0;

        bricks.forEach(b => {
          if (b.destroyed) return;
          if (b.durability !== 999) activeBricksLeft++;

          const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
          const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
          const distX = ball.x - closestX;
          const distY = ball.y - closestY;
          const dist = Math.sqrt(distX * distX + distY * distY);

          if (dist < BALL_RADIUS) {
            // Apply impact flash timer
            b.hitFlashTime = 4; // Flash for 4 frames (around 66ms)

            if (b.durability !== 999) {
              if (isFireballRef.current) {
                b.durability = 0;
              } else {
                b.durability--;
              }

              if (b.durability <= 0) {
                b.destroyed = true;
                
                // Realistic physical fragments split
                triggerFragments(b.x, b.y, b.width, b.height, b.color);
                triggerBurst(b.x + b.width / 2, b.y + b.height / 2, b.color, 12);
                maybeSpawnPowerUp(b.x + b.width / 2, b.y + b.height / 2);
                
                comboRef.current++;
                setCombo(comboRef.current);
                setMaxCombo(prev => Math.max(prev, comboRef.current));

                const multiplier = isScoreBoostRef.current ? 2 : 1;
                const comboBonus = Math.floor(comboRef.current / 3) * 50;
                const points = (b.scoreValue + comboBonus) * multiplier;
                
                setScore(prev => prev + points);
                spawnFloatText(`+${points}`, b.x + b.width / 2, b.y, b.color);
                
                // Screen shake on red or gold brick destruction
                if (b.maxDurability >= 3 || b.isSpecial) {
                  shakeTimerRef.current = 14;
                  playSound('victory');
                } else {
                  playSound('brick');
                }
              } else {
                triggerBurst(ball.x, ball.y, b.color, 5);
                playSound('bounce');
              }
            } else {
              // Unbreakable slate brick hit response
              triggerBurst(ball.x, ball.y, '#94a3b8', 6);
              playSound('bounce');
            }

            if (!isFireballRef.current) {
              if (Math.abs(distX) > Math.abs(distY)) {
                ball.vx = -ball.vx;
              } else {
                ball.vy = -ball.vy;
              }
            }
          }
        });

        // Check level victory
        if (activeBricksLeft === 0) {
          handleVictory();
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
            ballsRef.current = [
              {
                x: GAME_WIDTH / 2,
                y: GAME_HEIGHT - 55,
                vx: (Math.random() > 0.5 ? 1 : -1) * activeLevel.ballSpeed,
                vy: -activeLevel.ballSpeed,
                speed: activeLevel.ballSpeed,
                active: true,
                trail: []
              }
            ];
            setActivePowerUp(null);
            isFireballRef.current = false;
            isScoreBoostRef.current = false;
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
        ft.alpha -= 0.025 * delta;
        if (ft.alpha <= 0) {
          fTexts.splice(idx, 1);
        }
      });

      // --- RENDERING CANVAS DRAW CALLS ---
      // Draw Paddle
      ctx.shadowColor = activePowerUp ? '#a855f7' : '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.fillStyle = activePowerUp ? '#a855f7' : '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(pad.x, GAME_HEIGHT - PADDLE_HEIGHT - 8, pad.width, PADDLE_HEIGHT, 8);
      ctx.fill();

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
        
        // Draw trailing buffer shadow paths
        ball.trail.forEach((t, i) => {
          const trailAlpha = (i / ball.trail.length) * 0.22;
          ctx.fillStyle = isFireballRef.current ? `rgba(249, 115, 22, ${trailAlpha})` : `rgba(255, 255, 255, ${trailAlpha})`;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(t.x, t.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Core sphere
        ctx.fillStyle = isFireballRef.current ? '#f97316' : '#ffffff';
        ctx.shadowColor = isFireballRef.current ? '#f97316' : '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw falling Power-ups
      ctx.shadowBlur = 8;
      powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.shadowColor = pu.color;
        ctx.beginPath();
        ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type[0], pu.x + pu.width / 2, pu.y + pu.height / 2);
      });

      // Draw debris physical fragments with rotation
      ctx.shadowBlur = 0;
      fragments.forEach(f => {
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        // Draw rotated square debris
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
        ctx.font = 'bold 16px monospace';
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
  }, [screen, activeLevel, playSound, initLevelBricks]);

  const handleVictory = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    exitFullscreenAndLandscape();
    playSound('victory');
    triggerHaptic(150);

    let stars = 1;
    if (score > activeLevel.targetScore * 1.25) stars = 3;
    else if (score > activeLevel.targetScore) stars = 2;

    setEarnedStars(stars);
    setEarnedXP(activeLevel.xpReward);

    const unlocked = new Set(stats.completedLevels);
    unlocked.add(activeLevel.id);

    const newBestScore = Math.max(stats.bestScores[activeLevel.id] || 0, score);
    const newBestStars = Math.max(stats.stars[activeLevel.id] || 0, stars);
    
    let xpGain = 0;
    if (!stats.completedLevels.includes(activeLevel.id)) {
      xpGain = activeLevel.xpReward;
    }

    const updatedStats: LocalStats = {
      completedLevels: Array.from(unlocked),
      bestScores: { ...stats.bestScores, [activeLevel.id]: newBestScore },
      stars: { ...stats.stars, [activeLevel.id]: newBestStars },
      totalXP: stats.totalXP + xpGain
    };

    saveStats(updatedStats);
    setScreen('VICTORY');
  };

  const handleGameOver = () => {
    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    exitFullscreenAndLandscape();
    playSound('gameover');
    triggerHaptic(200);
    setScreen('GAME_OVER');
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
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7, 10, 20, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 1000, padding: '24px', textAlign: 'center' }}>
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
              Continue Portrait
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navigation Panel */}
      {screen !== 'PLAYING' && screen !== 'PAUSED' && (
        <header className="game-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-divider, #1e293b)', background: 'rgba(7, 10, 20, 0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Link 
              href="/dashboard" 
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

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
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
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, margin: 0 }}>
              Unlock levels, earn stars, and gain exclusive Smart Learn XP! Fits perfectly on mobile and desktop layout.
            </p>
          </div>

          {/* Level List - Path Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '540px', position: 'relative', paddingLeft: '12px', paddingRight: '12px', boxSizing: 'border-box' }}>
            
            {/* Connection Line */}
            <div style={{ position: 'absolute', left: '30px', top: '20px', bottom: '20px', width: '2px', background: 'linear-gradient(180deg, #06b6d4, #a855f7)', opacity: 0.3, zIndex: 1 }} />

            {LEVELS.map((level, idx) => {
              const isFirst = idx === 0;
              const isCompleted = stats.completedLevels.includes(level.id);
              const isLocked = !isFirst && !stats.completedLevels.includes(level.id - 1);
              const isActive = !isLocked && !isCompleted;
              const levelStars = stats.stars[level.id] || 0;
              const bestScore = stats.bestScores[level.id] || 0;

              return (
                <div 
                  key={level.id}
                  onClick={() => !isLocked && selectLevelForPlay(level)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: isLocked ? 'rgba(30, 41, 59, 0.2)' : isActive ? 'rgba(6, 182, 212, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: isLocked ? '1px solid rgba(255,255,255,0.03)' : isActive ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    zIndex: 2,
                    boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.12)' : 'none',
                    opacity: isLocked ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'grid',
                    placeItems: 'center',
                    background: isLocked ? '#1e293b' : isCompleted ? '#10b981' : 'linear-gradient(135deg, #06b6d4, #a855f7)',
                    flexShrink: 0
                  }}>
                    {isLocked ? <Lock size={14} color="#64748b" /> : isCompleted ? <CheckCircle2 size={14} color="white" /> : <Play size={14} color="white" fill="white" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: isLocked ? '#64748b' : 'var(--neon-cyan)' }}>LVL {level.id.toString().padStart(2, '0')}</span>
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
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: 'clamp(16px, 4vh, 30px) 24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            <span style={{ color: 'var(--neon-cyan)', fontSize: '11px', fontWeight: 800, letterSpacing: '2px' }}>LEVEL PREVIEW</span>
            
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
              display: 'grid',
              placeItems: 'center',
              margin: '14px auto 10px auto',
              boxShadow: '0 0 15px rgba(6,182,212,0.2)',
              flexShrink: 0
            }}>
              <Gamepad2 size={22} color="white" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 950, margin: '0 0 4px 0', color: 'white' }}>Level {activeLevel.id}: {activeLevel.title}</h3>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target score: {activeLevel.targetScore} points</span>

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
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ width: '32px', height: '8px', borderRadius: '2px', background: activeLevel.brickColors[i % activeLevel.brickColors.length] || '#06b6d4', opacity: 0.85 }} />
                ))}
              </div>
              {/* Ball & Paddle */}
              <div style={{ position: 'relative', width: '100%', height: '40px', marginTop: '6px' }}>
                {/* Ball */}
                <div style={{ position: 'absolute', left: '60%', top: '25%', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px #00f0ff' }} />
                {/* Paddle */}
                <div style={{ position: 'absolute', left: '40%', bottom: '5px', width: '50px', height: '6px', borderRadius: '3px', background: '#06b6d4', boxShadow: '0 0 6px #06b6d4' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.2' }}>
                Landscape gameplay activates on start
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>DIFFICULTY</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#facc15' }}>{activeLevel.difficulty}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>REWARD</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <Zap size={11} color="#10b981" fill="#10b981" /> +{activeLevel.xpReward} XP
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={startGame}
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
                Back to Levels
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
            background: 'rgba(30, 41, 59, 0.55)', 
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
                    style={{ display: idx < activeLevel.lives || idx < lives ? 'block' : 'none' }}
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
 
            {/* Level & Settings Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900 }}>LVL {activeLevel.id}</span>
              
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
                FPS: {fps}
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
                      onClick={startGame}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Restart Level
                    </button>
                    <button 
                      onClick={() => {
                        exitFullscreenAndLandscape();
                        setScreen('LOBBY');
                      }}
                      style={{ width: '100%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Exit to Lobby
                    </button>
                  </div>
                </div>
                {/* Removed redundant controls container */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VICTORY SCREEN */}
      {screen === 'VICTORY' && (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '16px', boxSizing: 'border-box', minHeight: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            
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
                <span style={{ color: '#64748b' }}>Combo</span>
                <span style={{ fontWeight: 800, color: '#f97316' }}>{maxCombo}x blocks</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ color: '#64748b' }}>XP Gained</span>
                <span style={{ fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Zap size={11} color="#a855f7" fill="#a855f7" /> +{earnedXP} XP
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeLevel.id < LEVELS.length ? (
                <button 
                  onClick={() => {
                    const next = LEVELS.find(l => l.id === activeLevel.id + 1);
                    if (next) selectLevelForPlay(next);
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
                  NEXT LEVEL
                </button>
              ) : (
                <div style={{ color: '#facc15', fontWeight: 800, fontSize: '14px', marginBottom: '8px' }}>
                  🏆 ALL LEVELS COMPLETED!
                </div>
              )}

              <button 
                onClick={startGame}
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
                onClick={() => setScreen('LOBBY')}
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
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: 'min(92%, 400px)', textAlign: 'center', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={startGame}
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
                Select Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Quote */}
      {screen !== 'PLAYING' && screen !== 'PAUSED' && (
        <footer style={{ textAlign: 'center', padding: '16px 20px', fontSize: '10px', color: '#475569', borderTop: '1px solid rgba(255, 255, 255, 0.02)' }}>
          <span>Smart Learn Brick Breaker Challenge • Retro Arcade Engine v2.0 • 60 FPS Canvas Physics</span>
        </footer>
      )}
    </div>
  );
}
