'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Heart, ArrowLeft, ArrowRight, RotateCcw, LayoutDashboard, Trophy } from 'lucide-react';
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
}

interface BallTrail {
  x: number;
  y: number;
  alpha: number;
}

export default function BrickBreakerGame() {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Game Engine State (Refs for zero-latency 60fps physics loop)
  const paddleRef = useRef({ x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2, width: PADDLE_WIDTH });
  const ballRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 35,
    vx: 4.5,
    vy: -4.5,
    baseSpeed: 6.2,
    speedMultiplier: 1.0,
  });
  const bricksRef = useRef<Brick[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<BallTrail[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // ── Web Audio API Synthesizer ──────────────────────────────────────────
  const playSound = useCallback((type: 'bounce' | 'brick' | 'special' | 'life' | 'gameover' | 'victory') => {
    if (!soundEnabled || typeof window === 'undefined') return;

    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'bounce') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'brick') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'special') {
        // Multi-frequency 404 special brick explosion chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = 'triangle';
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.04);
          subGain.gain.setValueAtTime(0.2, now + idx * 0.04);
          subGain.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.15);
          subOsc.connect(subGain);
          subGain.connect(ctx.destination);
          subOsc.start(now + idx * 0.04);
          subOsc.stop(now + idx * 0.04 + 0.15);
        });
      } else if (type === 'life') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'gameover') {
        [220, 196, 174, 130].forEach((freq, idx) => {
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = 'sawtooth';
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
          subGain.gain.setValueAtTime(0.25, now + idx * 0.12);
          subGain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.2);
          subOsc.connect(subGain);
          subGain.connect(ctx.destination);
          subOsc.start(now + idx * 0.12);
          subOsc.stop(now + idx * 0.12 + 0.2);
        });
      } else if (type === 'victory') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = 'sine';
          subOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          subGain.gain.setValueAtTime(0.25, now + idx * 0.1);
          subGain.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
          subOsc.connect(subGain);
          subGain.connect(ctx.destination);
          subOsc.start(now + idx * 0.1);
          subOsc.stop(now + idx * 0.1 + 0.3);
        });
      }
    } catch {
      // Ignore Web Audio API initialization blocks
    }
  }, [soundEnabled]);

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
        // Row 2, columns 3 & 4 (center) marked as special 404 brick
        const isSpecial = r === 2 && (c === 3 || c === 4);

        // If special, span 2 columns seamlessly for column 3
        if (r === 2 && c === 4) continue; // Skip column 4 to merge into column 3

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
    paddleRef.current = { x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2, width: PADDLE_WIDTH };
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 35,
      vx: (Math.random() > 0.5 ? 1 : -1) * 4.5,
      vy: -4.5,
      baseSpeed: 6.2,
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
    const count = isSpecial ? 36 : 14;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isSpecial ? 6.5 : 4.0) + 1.2;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (isSpecial ? 5 : 3.5) + 2,
        color: isSpecial ? (i % 2 === 0 ? '#00f0ff' : '#ef4444') : color,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.015,
      });
    }
    particlesRef.current.push(...newParticles);
  };

  // Launch Ball Action
  const handleLaunchBall = useCallback(() => {
    if (gameState === 'READY') {
      setGameState('PLAYING');
    } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
      handleFullReset();
      setGameState('PLAYING');
    }
  }, [gameState, handleFullReset]);

  // Pause / Resume Toggle
  const handleTogglePause = useCallback(() => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
    }
  }, [gameState]);

  // ── Keyboard Controls & Page Scroll Prevention ───────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      // Prevent scrolling for Space and Arrow keys
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

  // ── Mouse & Touch Pointer Position Mapper ────────────────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = relativeX * scaleX;

    // Center paddle on pointer
    const newPaddleX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, canvasX - PADDLE_WIDTH / 2));
    paddleRef.current.x = newPaddleX;

    if (gameState === 'READY') {
      ballRef.current.x = newPaddleX + PADDLE_WIDTH / 2;
    }
  };

  const handlePointerDown = () => {
    if (gameState === 'READY' || gameState === 'GAME_OVER' || gameState === 'VICTORY') {
      handleLaunchBall();
    }
  };

  // Initial bricks setup on mount
  useEffect(() => {
    initBricks();
    resetPositions();
  }, [initBricks, resetPositions]);

  // ── MAIN CANVAS RENDER & PHYSICS LOOP (60 FPS) ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
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

      // 2. Keyboard Paddle Movement Update
      const paddleSpeed = 8.5;
      if (keysRef.current.left) {
        paddle.x = Math.max(0, paddle.x - paddleSpeed);
      }
      if (keysRef.current.right) {
        paddle.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddle.x + paddleSpeed);
      }

      // Ball follows paddle when READY
      if (gameState === 'READY') {
        ball.x = paddle.x + PADDLE_WIDTH / 2;
        ball.y = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 4;
      }

      // 3. Game Physics Updates when PLAYING
      if (gameState === 'PLAYING') {
        // Record motion trail
        trailRef.current.unshift({ x: ball.x, y: ball.y, alpha: 0.6 });
        if (trailRef.current.length > 7) trailRef.current.pop();

        // Move Ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall Collisions (Left / Right)
        if (ball.x - BALL_RADIUS <= 0) {
          ball.x = BALL_RADIUS;
          ball.vx = Math.abs(ball.vx);
          playSound('bounce');
        } else if (ball.x + BALL_RADIUS >= CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - BALL_RADIUS;
          ball.vx = -Math.abs(ball.vx);
          playSound('bounce');
        }

        // Top Wall Collision
        if (ball.y - BALL_RADIUS <= 0) {
          ball.y = BALL_RADIUS;
          ball.vy = Math.abs(ball.vy);
          playSound('bounce');
        }

        // Bottom Wall (Life Loss)
        if (ball.y + BALL_RADIUS >= CANVAS_HEIGHT) {
          playSound('life');
          setLives((prevLives) => {
            const nextLives = prevLives - 1;
            if (nextLives <= 0) {
              setGameState('GAME_OVER');
              playSound('gameover');
            } else {
              setGameState('READY');
              resetPositions();
            }
            return nextLives;
          });
        }

        // Paddle Collision with Angle Reflection
        const paddleY = CANVAS_HEIGHT - PADDLE_HEIGHT - 6;
        if (
          ball.y + BALL_RADIUS >= paddleY &&
          ball.y - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
          ball.x >= paddle.x - 4 &&
          ball.x <= paddle.x + PADDLE_WIDTH + 4 &&
          ball.vy > 0
        ) {
          // Calculate hit position relative to paddle center (-1.0 to 1.0)
          const hitPos = (ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
          const maxBounceAngle = Math.PI / 3; // 60 degrees max
          const bounceAngle = hitPos * maxBounceAngle;

          const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = currentSpeed * Math.sin(bounceAngle);
          ball.vy = -currentSpeed * Math.cos(bounceAngle);

          playSound('bounce');
        }

        // Brick Collisions
        let activeBricksCount = 0;

        bricks.forEach((b) => {
          if (b.destroyed) return;
          activeBricksCount++;

          // AABB Collision check
          const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.width));
          const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.height));
          const distX = ball.x - closestX;
          const distY = ball.y - closestY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < BALL_RADIUS) {
            b.destroyed = true;

            // Progressive difficulty: increase ball speed multiplier by +1.5%
            ball.speedMultiplier = Math.min(1.75, ball.speedMultiplier + 0.015);
            const speed = ball.baseSpeed * ball.speedMultiplier;
            const currentDir = Math.atan2(ball.vy, ball.vx);

            // Rebound ball velocity
            if (Math.abs(distX) > Math.abs(distY)) {
              ball.vx = -ball.vx;
            } else {
              ball.vy = -ball.vy;
            }

            // Normalise speed
            const newAngle = Math.atan2(ball.vy, ball.vx);
            ball.vx = speed * Math.cos(newAngle);
            ball.vy = speed * Math.sin(newAngle);

            // Particles & Score
            createParticleBurst(b.x + b.width / 2, b.y + b.height / 2, b.color, b.isSpecial);

            if (b.isSpecial) {
              playSound('special');
              setScore((prev) => {
                const ns = prev + 500;
                checkAndSaveHighScore(ns);
                return ns;
              });
            } else {
              playSound('brick');
              setScore((prev) => {
                const ns = prev + 100;
                checkAndSaveHighScore(ns);
                return ns;
              });
            }
          }
        });

        // Check Victory Condition
        if (activeBricksCount === 0) {
          setGameState('VICTORY');
          playSound('victory');
          setScore((prev) => {
            const ns = prev + 1000;
            checkAndSaveHighScore(ns);
            return ns;
          });
        }
      }

      // 4. Draw Ball Motion Trail
      trailRef.current.forEach((t, i) => {
        ctx.fillStyle = `rgba(6, 182, 212, ${t.alpha * (1 - i / trailRef.current.length)})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_RADIUS * (1 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Bricks
      bricks.forEach((b) => {
        if (b.destroyed) return;

        ctx.save();
        if (b.isSpecial) {
          // Special 404 Brick with glowing red/pink outline
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.width, b.height, 6);
          ctx.fill();
          ctx.stroke();

          // Render "404" glowing text inside special brick
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 13px Consolas, Monaco, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('404', b.x + b.width / 2, b.y + b.height / 2 + 1);
        } else {
          // Regular Brick
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 6;

          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.width, b.height, 5);
          ctx.fill();

          // Subtle diagonal line pattern for texture
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x + 4, b.y + b.height - 4);
          ctx.lineTo(b.x + b.width - 4, b.y + 4);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 6. Draw Particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
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

      // 7. Draw Paddle
      ctx.save();
      ctx.fillStyle = 'linear-gradient(90deg, #00f0ff, #3b82f6)';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(paddle.x, CANVAS_HEIGHT - PADDLE_HEIGHT - 6, PADDLE_WIDTH, PADDLE_HEIGHT, 7);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 8. Draw Ball
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Loop frame
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

            {/* Sound & Pause Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`icon-btn-game ${soundEnabled ? 'active' : ''}`}
                title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
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
              <span className="overlay-badge">404 MINI-GAME</span>
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
            <span>MOVE</span>
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
