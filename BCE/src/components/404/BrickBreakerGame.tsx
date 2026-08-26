'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, Music, Music2, RotateCcw, LayoutDashboard, Trophy, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import './BrickBreakerGame.css';

// LocalStorage key for High Score
const HIGH_SCORE_KEY = 'smartlearn_404_brickbreaker_highscore';

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 440;
const PADDLE_WIDTH = 110;
const PADDLE_HEIGHT = 14;
const BALL_RADIUS = 7;
const BRICK_ROWS = 4;
const BRICK_COLS = 8;
const BRICK_PADDING = 8;
const BRICK_TOP_OFFSET = 50;

type GameState = 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isSpecial: boolean; // 404 Special Brick
  destroyed: boolean;
  row: number;
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
  gravity?: number;
}

interface BallTrail {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  scale: number;
}

export default function BrickBreakerGame() {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bgmStepRef = useRef<number>(0);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Game Engine State (Refs for 120fps smooth physics loop)
  const paddleRef = useRef({
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    targetX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    width: PADDLE_WIDTH,
    tilt: 0,
  });
  const ballRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 35,
    vx: 4.8,
    vy: -4.8,
    baseSpeed: 6.5,
    speedMultiplier: 1.0,
  });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<BallTrail[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const shakeTimeRef = useRef<number>(0);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // ── Web Audio API Synthesizer (Loud & Punchy SFX + Arcade BGM) ───────
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

  const playSound = useCallback(
    (type: 'bounce' | 'brick' | 'special' | 'life' | 'gameover' | 'victory', panX: number = 0.5) => {
      if (!soundEnabled) return;
      const ctx = initAudio();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master Gain for Loud Punchy Sound
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.45, now);

      // Stereo Panner (Left/Right position effect)
      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        const panValue = Math.max(-0.8, Math.min(0.8, (panX - 0.5) * 1.6));
        panner.pan.setValueAtTime(panValue, now);
        masterGain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        masterGain.connect(ctx.destination);
      }

      if (type === 'bounce') {
        // Deep sub-bass thud + punchy impact click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.09);

        // Click transient
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(800, now);
        clickOsc.frequency.linearRampToValueAtTime(200, now + 0.02);
        clickGain.gain.setValueAtTime(0.4, now);
        clickGain.gain.linearRampToValueAtTime(0.01, now + 0.02);
        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
      } else if (type === 'brick') {
        // Glass shatter + punchy synth burst
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.1);
      } else if (type === 'special') {
        // 404 Special Brick Explosion Chord + Sub Drop
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.03);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.03 + 0.25);
          gain.gain.setValueAtTime(0.4, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.03 + 0.25);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.03);
          osc.stop(now + idx * 0.03 + 0.25);
        });
      } else if (type === 'life') {
        // Warning sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'gameover') {
        // Minor chord descent
        [220, 196, 174, 130, 98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.4, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.25);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.25);
        });
      } else if (type === 'victory') {
        // Major fanfare chord ascent
        [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.45, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.35);
        });
      }
    },
    [soundEnabled, initAudio]
  );

  // ── Procedural Synthwave BGM Loop ───────────────────────────────────
  useEffect(() => {
    if (!musicEnabled || gameState !== 'PLAYING') {
      if (bgmTimerRef.current) clearInterval(bgmTimerRef.current);
      return;
    }

    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 98, 87.31]; // A, C, D, A, G, F
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
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.16);

      gain.gain.setValueAtTime(0.12, now);
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
  }, [musicEnabled, gameState, initAudio]);

  // Read High Score on client mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
      if (savedScore) setHighScore(parseInt(savedScore, 10) || 0);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Update High Score helper
  const checkAndSaveHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        } catch {
          // Ignore storage error
        }
        return newScore;
      }
      return prev;
    });
  }, []);

  // Initialize Bricks Layout
  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const totalPaddingX = BRICK_PADDING * (BRICK_COLS + 1);
    const brickWidth = (CANVAS_WIDTH - totalPaddingX) / BRICK_COLS;
    const brickHeight = 26;

    const rowColors = [
      '#a855f7', // Row 0: Purple
      '#6366f1', // Row 1: Deep Indigo
      '#3b82f6', // Row 2: Blue
      '#06b6d4', // Row 3: Neon Cyan
    ];

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const isSpecial = r === 2 && (c === 3 || c === 4);
        if (r === 2 && c === 4) continue; // Merge column 4 into 3 for 404 brick

        const currentWidth = isSpecial ? brickWidth * 2 + BRICK_PADDING : brickWidth;

        bricks.push({
          x: BRICK_PADDING + c * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (brickHeight + BRICK_PADDING),
          width: currentWidth,
          height: brickHeight,
          color: isSpecial ? '#ef4444' : rowColors[r],
          isSpecial,
          destroyed: false,
          row: r,
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  // Reset ball & paddle positions
  const resetPositions = useCallback(() => {
    paddleRef.current = {
      x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      targetX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      width: PADDLE_WIDTH,
      tilt: 0,
    };
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 35,
      vx: (Math.random() > 0.5 ? 1 : -1) * 4.8,
      vy: -4.8,
      baseSpeed: 6.5,
      speedMultiplier: 1.0,
    };
    trailRef.current = [];
  }, []);

  // Reset complete game
  const handleFullReset = useCallback(() => {
    setScore(0);
    setLives(3);
    initBricks();
    resetPositions();
    setGameState('READY');
  }, [initBricks, resetPositions]);

  // Particle Burst Creator
  const createParticleBurst = (x: number, y: number, color: string, isSpecial: boolean = false) => {
    const count = isSpecial ? 42 : 16;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isSpecial ? 7.5 : 4.5) + 1.5;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (isSpecial ? 5.5 : 3.8) + 2,
        color: isSpecial ? (i % 2 === 0 ? '#00f0ff' : '#ef4444') : color,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        gravity: 0.12,
      });
    }
    particlesRef.current.push(...newParticles);
  };

  // Spawn Floating Score Text
  const spawnFloatingText = (text: string, x: number, y: number, color: string) => {
    floatTextsRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      alpha: 1.0,
      color,
      scale: 1.0,
    });
  };

  // Launch Ball Action
  const handleLaunchBall = useCallback(() => {
    initAudio();
    if (gameState === 'READY') {
      setGameState('PLAYING');
    } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
      handleFullReset();
      setGameState('PLAYING');
    }
  }, [gameState, handleFullReset, initAudio]);

  // Pause / Resume Toggle
  const handleTogglePause = useCallback(() => {
    initAudio();
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
    }
  }, [gameState, initAudio]);

  // ── Keyboard Controls & Page Scroll Prevention ───────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'ArrowLeft' || code === 'KeyA') {
        keysRef.current.left = true;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        keysRef.current.right = true;
      } else if (code === 'Space') {
        handleLaunchBall();
      } else if (code === 'KeyP') {
        handleTogglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') {
        keysRef.current.left = false;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        keysRef.current.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLaunchBall, handleTogglePause]);

  // ── Mouse & Touch Pointer Position Mapper (Smooth Lerp) ──────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = relativeX * scaleX;

    const newTargetX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, canvasX - PADDLE_WIDTH / 2));
    paddleRef.current.targetX = newTargetX;
  };

  const handlePointerDown = () => {
    initAudio();
    if (gameState === 'READY' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
      handleLaunchBall();
    }
  };

  // Initial setup
  useEffect(() => {
    initBricks();
    resetPositions();
  }, [initBricks, resetPositions]);

  // ── MAIN CANVAS RENDER & PHYSICS LOOP ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      ctx.save();

      // Screen Shake translation
      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current--;
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Clear Canvas Background
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw subtle neon grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      const paddle = paddleRef.current;
      const ball = ballRef.current;
      const bricks = bricksRef.current;

      // 2. Keyboard & Lerp Smooth Paddle Movement
      const keyboardSpeed = 9.5;
      if (keysRef.current.left) {
        paddle.targetX = Math.max(0, paddle.targetX - keyboardSpeed);
      }
      if (keysRef.current.right) {
        paddle.targetX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddle.targetX + keyboardSpeed);
      }

      // Smooth Interpolation (Lerp) for silky paddle movement
      const prevX = paddle.x;
      paddle.x += (paddle.targetX - paddle.x) * 0.32;
      paddle.tilt = Math.max(-0.1, Math.min(0.1, (paddle.x - prevX) * 0.03));

      // Ball follows paddle when READY
      if (gameState === 'READY') {
        ball.x = paddle.x + PADDLE_WIDTH / 2;
        ball.y = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 4;
      }

      // 3. Game Physics Updates when PLAYING
      if (gameState === 'PLAYING') {
        // Record motion trail
        trailRef.current.unshift({ x: ball.x, y: ball.y, alpha: 0.7, radius: BALL_RADIUS });
        if (trailRef.current.length > 9) trailRef.current.pop();

        // Move Ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        const panRatio = ball.x / CANVAS_WIDTH;

        // Wall Collisions (Left / Right)
        if (ball.x - BALL_RADIUS <= 0) {
          ball.x = BALL_RADIUS;
          ball.vx = Math.abs(ball.vx);
          playSound('bounce', 0);
        } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx);
          playSound('bounce', 1);
        }

        // Top Wall Collision
        if (ball.y - BALL_RADIUS <= 0) {
          ball.y = BALL_RADIUS;
          ball.vy = Math.abs(ball.vy);
          playSound('bounce', panRatio);
        }

        // Bottom Wall (Life Loss)
        if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
          playSound('life', panRatio);
          setLives((prevLives) => {
            const nextLives = prevLives - 1;
            if (nextLives <= 0) {
              setGameState('GAME_OVER');
              playSound('gameover', panRatio);
            } else {
              setGameState('READY');
              resetPositions();
            }
            return nextLives;
          });
        }

        // Paddle Collision with Variable Reflection Angle
        const paddleY = CANVAS_HEIGHT - PADDLE_HEIGHT - 6;
        if (
          ball.y + BALL_RADIUS >= paddleY &&
          ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
          ball.x >= paddle.x - 4 &&
          ball.x <= paddle.x + PADDLE_WIDTH + 4 &&
          ball.vy > 0
        ) {
          const hitPos = (ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
          const maxBounceAngle = Math.PI / 3;
          const bounceAngle = hitPos * maxBounceAngle;

          const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = currentSpeed * Math.sin(bounceAngle);
          ball.vy = -currentSpeed * Math.cos(bounceAngle);

          playSound('bounce', panRatio);
        }

        // Brick Collisions
        let activeBricksCount = 0;

        bricks.forEach((b) => {
          if (b.destroyed) return;
          activeBricksCount++;

          const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
          const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
          const distX = ball.x - closestX;
          const distY = ball.y - closestY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < BALL_RADIUS) {
            b.destroyed = true;

            // Progressive difficulty increase
            ball.speedMultiplier = Math.min(1.8, ball.speedMultiplier + 0.015);
            const speed = ball.baseSpeed * ball.speedMultiplier;

            if (Math.abs(distX) > Math.abs(distY)) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }

            const newAngle = Math.atan2(ball.vy, ball.vx);
            ball.vx = speed * Math.cos(newAngle);
            ball.vy = speed * Math.sin(newAngle);

            const brickPan = (b.x + b.width / 2) / CANVAS_WIDTH;
            createParticleBurst(b.x + b.width / 2, b.y + b.height / 2, b.color, b.isSpecial);

            if (b.isSpecial) {
              playSound('special', brickPan);
              shakeTimeRef.current = 14; // Trigger screen shake
              spawnFloatingText('+500 404!', b.x + b.width / 2, b.y, '#ef4444');
              setScore((prev) => {
                const ns = prev + 500;
                checkAndSaveHighScore(ns);
                return ns;
              });
            } else {
              playSound('brick', brickPan);
              spawnFloatingText('+100', b.x + b.width / 2, b.y, b.color);
              setScore((prev) => {
                const ns = prev + 100;
                checkAndSaveHighScore(ns);
                return ns;
              });
            }
          }
        });

        if (activeBricksCount === 0) {
          setGameState('VICTORY');
          playSound('victory');
          spawnFloatingText('PERFECT CLEAR! +1000', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#4ade80');
          setScore((prev) => {
            const ns = prev + 1000;
            checkAndSaveHighScore(ns);
            return ns;
          });
        }
      }

      // 4. Draw Ball Motion Trail
      trailRef.current.forEach((t, i) => {
        const factor = 1 - i / trailRef.current.length;
        ctx.fillStyle = `rgba(6, 182, 212, ${t.alpha * factor})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * factor, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Bricks
      bricks.forEach((b) => {
        if (b.destroyed) return;

        ctx.save();
        if (b.isSpecial) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.width, b.height, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px Consolas, Monaco, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('404', b.x + b.width / 2, b.y + b.height / 2 + 1);
        } else {
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 6;

          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.width, b.height, 5);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x + 4, b.y + b.height - 4);
          ctx.lineTo(b.x + b.width - 4, b.y + 4);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 6. Draw Particles with Gravity
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Draw Floating Score Text Popups
      floatTextsRef.current.forEach((ft, idx) => {
        ft.y -= 1.2;
        ft.alpha -= 0.02;

        if (ft.alpha <= 0) {
          floatTextsRef.current.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = '900 14px Consolas, Monaco, monospace';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // 8. Draw Smooth Tilted Paddle
      ctx.save();
      const paddleY = CANVAS_HEIGHT - PADDLE_HEIGHT - 6;
      ctx.translate(paddle.x + PADDLE_WIDTH / 2, paddleY + PADDLE_HEIGHT / 2);
      ctx.rotate(paddle.tilt);

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(-PADDLE_WIDTH / 2, -PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT, 7);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 9. Draw Ball with Glowing Halo
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // Restore Screen Shake Canvas State
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [gameState, playSound, resetPositions, checkAndSaveHighScore]);

  return (
    <div className="not-found-page-wrapper">
      {/* Top Header Navbar */}
      <nav className="not-found-nav">
        <Link href="/dashboard" className="not-found-nav-brand">
          <div className="not-found-nav-logo">
            <span style={{ fontWeight: 900, color: '#fff', fontSize: '15px' }}>⚡</span>
          </div>
          <span className="not-found-nav-title">Smart Learn</span>
        </Link>

        <Link href="/courses" className="not-found-nav-link">
          Courses
        </Link>

        <span className="not-found-nav-center">Smart Learn</span>

        <Link href="/dashboard" className="not-found-nav-btn">
          <LayoutDashboard size={14} /> Dashboard
        </Link>
      </nav>

      {/* Main Game Card */}
      <main className="game-card-container">
        {/* Header Bar inside card */}
        <header className="game-header-bar">
          {/* Score Box */}
          <div className="score-panel">
            <div className="score-box">
              <span className="score-label">Score</span>
              <span className="score-value-cyan">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="score-box">
              <span className="score-label">High Score</span>
              <span className="score-value-purple">{highScore.toString().padStart(6, '0')}</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="game-title-center">
            <h1 className="game-title-404">404</h1>
            <h2 className="game-subtitle">Page Not Found</h2>
            <p className="game-desc">
              Looks like you hit a glitch in the system.<br />
              Break the blocks, clear the error!
            </p>
          </div>

          {/* Controls Right Panel */}
          <div className="controls-top-right">
            {/* Lives Hearts */}
            <div className="lives-row" title={`Remaining Lives: ${lives}`}>
              {[1, 2, 3].map((hIdx) => (
                <Heart
                  key={hIdx}
                  size={20}
                  fill={hIdx <= lives ? '#00f0ff' : 'transparent'}
                  color={hIdx <= lives ? '#06b6d4' : '#334155'}
                  style={{
                    filter: hIdx <= lives ? 'drop-shadow(0 0 6px #06b6d4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Sound, Music & Pause Controls */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`icon-btn-game ${musicEnabled ? 'active' : ''}`}
                title={musicEnabled ? 'Mute BGM Music' : 'Enable BGM Music'}
              >
                {musicEnabled ? <Music size={16} /> : <Music2 size={16} style={{ opacity: 0.5 }} />}
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`icon-btn-game ${soundEnabled ? 'active' : ''}`}
                title={soundEnabled ? 'Mute SFX Sound' : 'Enable SFX Sound'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                type="button"
                onClick={handleTogglePause}
                className={`icon-btn-game ${gameState === 'PAUSED' ? 'active' : ''}`}
                title={gameState === 'PAUSED' ? 'Resume (P)' : 'Pause (P)'}
              >
                {gameState === 'PAUSED' ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>
          </div>
        </header>

        {/* Canvas Game Area */}
        <div
          ref={containerRef}
          className="canvas-wrapper"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="game-canvas"
          />

          {/* Game Overlays */}
          {gameState === 'READY' && (
            <div className="game-overlay">
              <span className="overlay-badge">
                <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} /> 404 ARCADE MINI-GAME
              </span>
              <h3 className="overlay-title">Ready to Play?</h3>
              <p className="overlay-sub">Use Arrow keys or Mouse to move paddle. Press Space or Click to launch ball!</p>
              <button type="button" onClick={handleLaunchBall} className="overlay-btn">
                Launch Ball (Space)
              </button>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <div className="game-overlay">
              <span className="overlay-badge">GAME PAUSED</span>
              <h3 className="overlay-title">Game Paused</h3>
              <p className="overlay-sub">Take a breather! Press P or click below to resume your game.</p>
              <button type="button" onClick={handleTogglePause} className="overlay-btn">
                Resume Game (P)
              </button>
            </div>
          )}

          {gameState === 'GAME_OVER' && (
            <div className="game-overlay">
              <span className="overlay-badge" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                GAME OVER
              </span>
              <h3 className="overlay-title">Glitch Won This Round!</h3>
              <p className="overlay-sub">Final Score: <strong>{score}</strong> | High Score: <strong>{highScore}</strong></p>
              <button type="button" onClick={handleFullReset} className="overlay-btn">
                Try Again (Space)
              </button>
            </div>
          )}

          {gameState === 'VICTORY' && (
            <div className="game-overlay">
              <span className="overlay-badge" style={{ color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' }}>
                ERROR CLEARED!
              </span>
              <h3 className="overlay-title">404 Error Obliterated! 🎉</h3>
              <p className="overlay-sub">Awesome job! Perfect run bonus awarded. Final Score: <strong>{score}</strong></p>
              <button type="button" onClick={handleFullReset} className="overlay-btn">
                Play Again (Space)
              </button>
            </div>
          )}
        </div>

        {/* Controls Legend Bar */}
        <div className="controls-legend-bar">
          <div className="control-item">
            <span className="key-cap">←</span>
            <span className="key-cap">→</span>
            <span>MOVE PADDLE</span>
          </div>
          <div className="control-item">
            <span className="key-cap">SPACE</span>
            <span>LAUNCH / RESTART</span>
          </div>
          <div className="control-item">
            <span className="key-cap">P</span>
            <span>PAUSE</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="action-buttons-row">
          <Link href="/dashboard" className="btn-primary-gradient">
            <LayoutDashboard size={16} /> Back to Dashboard
          </Link>
          <Link href="/leaderboard" className="btn-secondary-glass">
            <Trophy size={16} /> Go to Leaderboard
          </Link>
        </div>

        {/* Footer Quote */}
        <p className="not-found-footer-quote">
          Lost? Even the best learners take wrong turns.<br />
          Keep learning, keep leveling up! 🚀
        </p>
      </main>
    </div>
  );
}
