import React, { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../../utils/haptics';
import './NeonAirHockey.css';

const WIDTH = 900;
const HEIGHT = 540;
const GOAL_HEIGHT = 170;
const PUCK_RADIUS = 12;
const MALLET_RADIUS = 30;
const MAX_SCORE = 7;
const JOYSTICK_MAX = 34;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function vectorToStep(inputX, inputY, speed) {
  const magnitude = Math.hypot(inputX, inputY);
  if (magnitude <= 0.0001) {
    return { dx: 0, dy: 0 };
  }
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  return {
    dx: inputX * scale * speed,
    dy: inputY * scale * speed,
  };
}

function makeInitialState(mode) {
  return {
    mode,
    leftScore: 0,
    rightScore: 0,
    gameOver: false,
    winner: null,
    goalFlash: null,
    particles: [],
    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    },
    left: {
      x: 140,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: MALLET_RADIUS,
      color: '#ff2fd9',
      speed: 7,
    },
    right: {
      x: WIDTH - 140,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: MALLET_RADIUS,
      color: '#22f3ff',
      speed: 7,
    },
    puck: {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 5,
      vy: (Math.random() * 2 - 1) * 4,
      radius: PUCK_RADIUS,
      color: '#ffffff',
    },
  };
}

function moveMallet(mallet, dx, dy) {
  mallet.vx = dx;
  mallet.vy = dy;
  mallet.x += dx;
  mallet.y += dy;
}

function keepMalletInBounds(mallet, isLeft) {
  const halfBoundary = WIDTH / 2;
  if (isLeft) {
    mallet.x = clamp(mallet.x, mallet.radius + 8, halfBoundary - mallet.radius - 10);
  } else {
    mallet.x = clamp(mallet.x, halfBoundary + mallet.radius + 10, WIDTH - mallet.radius - 8);
  }
  mallet.y = clamp(mallet.y, mallet.radius + 8, HEIGHT - mallet.radius - 8);
}

function resolveCircleCollision(puck, mallet) {
  const dx = puck.x - mallet.x;
  const dy = puck.y - mallet.y;
  const distSq = dx * dx + dy * dy;
  const minDist = puck.radius + mallet.radius;

  if (distSq >= minDist * minDist) return false;

  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  const overlap = minDist - dist;
  puck.x += nx * overlap;
  puck.y += ny * overlap;

  const relativeVx = puck.vx - mallet.vx;
  const relativeVy = puck.vy - mallet.vy;
  const impactSpeed = relativeVx * nx + relativeVy * ny;

  if (impactSpeed < 0) {
    const bounce = 1.85;
    puck.vx -= (1 + bounce) * impactSpeed * nx;
    puck.vy -= (1 + bounce) * impactSpeed * ny;
  }

  puck.vx += mallet.vx * 0.28;
  puck.vy += mallet.vy * 0.28;

  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed > 17) {
    puck.vx = (puck.vx / speed) * 17;
    puck.vy = (puck.vy / speed) * 17;
  }

  return true;
}

function spawnCollisionParticles(state, x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1,
      color,
    });
  }
}

export default function NeonAirHockey() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeInitialState('ai'));
  const flashTimerRef = useRef(null);
  const joystickPointerRef = useRef({ left: null, right: null });
  const touchVectorRef = useRef({
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  });

  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState('ai');
  const [ui, setUi] = useState({
    leftScore: 0,
    rightScore: 0,
    gameOver: false,
    winner: null,
    goalFlash: null,
  });
  const [joystickUi, setJoystickUi] = useState({
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  });

  const syncUi = () => {
    const s = stateRef.current;
    setUi({
      leftScore: s.leftScore,
      rightScore: s.rightScore,
      gameOver: s.gameOver,
      winner: s.winner,
      goalFlash: s.goalFlash,
    });
  };

  const resetRound = (scoredOnRight) => {
    const s = stateRef.current;
    s.puck.x = WIDTH / 2;
    s.puck.y = HEIGHT / 2;
    s.puck.vx = (scoredOnRight ? -1 : 1) * (4.8 + Math.random() * 1.5);
    s.puck.vy = (Math.random() * 2 - 1) * 3.6;

    s.left.x = 140;
    s.left.y = HEIGHT / 2;
    s.right.x = WIDTH - 140;
    s.right.y = HEIGHT / 2;
    s.left.vx = 0;
    s.left.vy = 0;
    s.right.vx = 0;
    s.right.vy = 0;
  };

  const resetInputState = () => {
    const k = stateRef.current.keys;
    k.w = false;
    k.a = false;
    k.s = false;
    k.d = false;
    k.ArrowUp = false;
    k.ArrowDown = false;
    k.ArrowLeft = false;
    k.ArrowRight = false;

    touchVectorRef.current.left.x = 0;
    touchVectorRef.current.left.y = 0;
    touchVectorRef.current.right.x = 0;
    touchVectorRef.current.right.y = 0;
    joystickPointerRef.current.left = null;
    joystickPointerRef.current.right = null;
    setJoystickUi({
      left: { x: 0, y: 0 },
      right: { x: 0, y: 0 },
    });
  };

  const setJoystickFromPointer = (side, clientX, clientY, element) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;

    const length = Math.hypot(dx, dy);
    if (length > JOYSTICK_MAX) {
      const ratio = JOYSTICK_MAX / length;
      dx *= ratio;
      dy *= ratio;
    }

    const normX = dx / JOYSTICK_MAX;
    const normY = dy / JOYSTICK_MAX;

    touchVectorRef.current[side].x = clamp(normX, -1, 1);
    touchVectorRef.current[side].y = clamp(normY, -1, 1);
    setJoystickUi((prev) => ({
      ...prev,
      [side]: { x: dx, y: dy },
    }));
  };

  const releaseJoystick = (side) => {
    joystickPointerRef.current[side] = null;
    touchVectorRef.current[side].x = 0;
    touchVectorRef.current[side].y = 0;
    setJoystickUi((prev) => ({
      ...prev,
      [side]: { x: 0, y: 0 },
    }));
  };

  const handleJoystickPointerDown = (side, event) => {
    if (mode !== 'local') return;
    event.preventDefault();
    joystickPointerRef.current[side] = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setJoystickFromPointer(side, event.clientX, event.clientY, event.currentTarget);
  };

  const handleJoystickPointerMove = (side, event) => {
    if (mode !== 'local') return;
    if (joystickPointerRef.current[side] !== event.pointerId) return;
    event.preventDefault();
    setJoystickFromPointer(side, event.clientX, event.clientY, event.currentTarget);
  };

  const handleJoystickPointerUp = (side, event) => {
    if (joystickPointerRef.current[side] !== event.pointerId) return;
    releaseJoystick(side);
  };

  const startGame = (nextMode = mode) => {
    resetInputState();
    setMode(nextMode);
    stateRef.current = makeInitialState(nextMode);
    setShowIntro(false);
    syncUi();
  };

  const switchModeInGame = (nextMode) => {
    resetInputState();
    startGame(nextMode);
  };

  const backToMenu = () => {
    resetInputState();
    setShowIntro(true);
  };

  useEffect(() => {
    if (showIntro) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let rafId;

    const keyDown = (event) => {
      const k = stateRef.current.keys;
      if (event.key in k) {
        k[event.key] = true;
        if (event.key.startsWith('Arrow')) event.preventDefault();
      }
      if (event.key === 'W') k.w = true;
      if (event.key === 'A') k.a = true;
      if (event.key === 'S') k.s = true;
      if (event.key === 'D') k.d = true;
    };

    const keyUp = (event) => {
      const k = stateRef.current.keys;
      if (event.key in k) k[event.key] = false;
      if (event.key === 'W') k.w = false;
      if (event.key === 'A') k.a = false;
      if (event.key === 'S') k.s = false;
      if (event.key === 'D') k.d = false;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const renderRink = () => {
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#070112');
      grad.addColorStop(1, '#03111a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const goalTop = (HEIGHT - GOAL_HEIGHT) / 2;
      const goalBottom = goalTop + GOAL_HEIGHT;

      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 10);
      ctx.lineTo(WIDTH / 2, HEIGHT - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 47, 217, 0.2)';
      ctx.fillRect(0, goalTop, 14, GOAL_HEIGHT);
      ctx.fillStyle = 'rgba(34, 243, 255, 0.2)';
      ctx.fillRect(WIDTH - 14, goalTop, 14, GOAL_HEIGHT);

      const flashSide = stateRef.current.goalFlash;
      if (flashSide === 'left') {
        ctx.fillStyle = 'rgba(255, 47, 217, 0.18)';
        ctx.fillRect(0, goalTop - 16, WIDTH / 2, GOAL_HEIGHT + 32);
      } else if (flashSide === 'right') {
        ctx.fillStyle = 'rgba(34, 243, 255, 0.18)';
        ctx.fillRect(WIDTH / 2, goalTop - 16, WIDTH / 2, GOAL_HEIGHT + 32);
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let y = 30; y < HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }

      return { goalTop, goalBottom };
    };

    const drawMallet = (mallet) => {
      const halo = ctx.createRadialGradient(mallet.x, mallet.y, 5, mallet.x, mallet.y, mallet.radius + 20);
      halo.addColorStop(0, mallet.color);
      halo.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mallet.x, mallet.y, mallet.radius + 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = mallet.color;
      ctx.beginPath();
      ctx.arc(mallet.x, mallet.y, mallet.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0b0f12';
      ctx.beginPath();
      ctx.arc(mallet.x, mallet.y, mallet.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPuck = (puck) => {
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = puck.color;
      ctx.beginPath();
      ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const loop = () => {
      const s = stateRef.current;

      const { goalTop, goalBottom } = renderRink();

      if (!s.gameOver) {
        const leftInputX = (s.keys.d ? 1 : 0) + (s.keys.a ? -1 : 0) + touchVectorRef.current.left.x;
        const leftInputY = (s.keys.s ? 1 : 0) + (s.keys.w ? -1 : 0) + touchVectorRef.current.left.y;
        const leftStep = vectorToStep(leftInputX, leftInputY, s.left.speed);
        const leftDx = leftStep.dx;
        const leftDy = leftStep.dy;
        moveMallet(s.left, leftDx, leftDy);
        keepMalletInBounds(s.left, true);

        if (s.mode === 'local') {
          const rightInputX = (s.keys.ArrowRight ? 1 : 0) + (s.keys.ArrowLeft ? -1 : 0) + touchVectorRef.current.right.x;
          const rightInputY = (s.keys.ArrowDown ? 1 : 0) + (s.keys.ArrowUp ? -1 : 0) + touchVectorRef.current.right.y;
          const rightStep = vectorToStep(rightInputX, rightInputY, s.right.speed);
          const rightDx = rightStep.dx;
          const rightDy = rightStep.dy;
          moveMallet(s.right, rightDx, rightDy);
        } else {
          const targetX = clamp(s.puck.x + 45, WIDTH / 2 + 50, WIDTH - s.right.radius - 12);
          const targetY = clamp(s.puck.y, s.right.radius + 8, HEIGHT - s.right.radius - 8);
          const dx = targetX - s.right.x;
          const dy = targetY - s.right.y;
          const dist = Math.hypot(dx, dy) || 1;
          const maxStep = 5.6;
          moveMallet(s.right, (dx / dist) * Math.min(maxStep, dist), (dy / dist) * Math.min(maxStep, dist));
        }
        keepMalletInBounds(s.right, false);

        s.puck.x += s.puck.vx;
        s.puck.y += s.puck.vy;

        s.puck.vx *= 0.996;
        s.puck.vy *= 0.996;

        if (Math.abs(s.puck.vx) < 0.06) s.puck.vx = 0;
        if (Math.abs(s.puck.vy) < 0.06) s.puck.vy = 0;

        if (s.puck.y - s.puck.radius <= 8) {
          s.puck.y = 8 + s.puck.radius;
          s.puck.vy *= -1;
        }
        if (s.puck.y + s.puck.radius >= HEIGHT - 8) {
          s.puck.y = HEIGHT - 8 - s.puck.radius;
          s.puck.vy *= -1;
        }

        if (s.puck.x - s.puck.radius <= 8) {
          if (s.puck.y >= goalTop && s.puck.y <= goalBottom) {
            s.rightScore += 1;
            triggerHaptic('goal', { key: 'air-hockey-goal-right', cooldown: 220 });
            s.goalFlash = 'left';
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => {
              stateRef.current.goalFlash = null;
              syncUi();
            }, 220);

            if (s.rightScore >= MAX_SCORE) {
              s.gameOver = true;
              s.winner = s.mode === 'local' ? 'Player 2' : 'AI';
              triggerHaptic('gameOver', { key: 'air-hockey-over', cooldown: 500 });
            } else {
              resetRound(false);
            }
            syncUi();
          } else {
            s.puck.x = 8 + s.puck.radius;
            s.puck.vx *= -1;
          }
        }

        if (s.puck.x + s.puck.radius >= WIDTH - 8) {
          if (s.puck.y >= goalTop && s.puck.y <= goalBottom) {
            s.leftScore += 1;
            triggerHaptic('goal', { key: 'air-hockey-goal-left', cooldown: 220 });
            s.goalFlash = 'right';
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => {
              stateRef.current.goalFlash = null;
              syncUi();
            }, 220);

            if (s.leftScore >= MAX_SCORE) {
              s.gameOver = true;
              s.winner = 'Player 1';
              triggerHaptic('gameOver', { key: 'air-hockey-over', cooldown: 500 });
            } else {
              resetRound(true);
            }
            syncUi();
          } else {
            s.puck.x = WIDTH - 8 - s.puck.radius;
            s.puck.vx *= -1;
          }
        }

        const leftHit = resolveCircleCollision(s.puck, s.left);
        if (leftHit) {
          triggerHaptic('soft', { key: 'air-hockey-hit-left', cooldown: 40 });
          spawnCollisionParticles(s, s.puck.x, s.puck.y, '#ff2fd9');
        }

        const rightHit = resolveCircleCollision(s.puck, s.right);
        if (rightHit) {
          triggerHaptic('soft', { key: 'air-hockey-hit-right', cooldown: 40 });
          spawnCollisionParticles(s, s.puck.x, s.puck.y, '#22f3ff');
        }

        for (let i = s.particles.length - 1; i >= 0; i -= 1) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.05;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      drawMallet(s.left);
      drawMallet(s.right);
      drawPuck(s.puck);

      s.particles.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      window.cancelAnimationFrame(rafId);
    };
  }, [showIntro]);

  return (
    <div className="air-hockey-container">
      {showIntro ? (
        <div className="air-hockey-intro">
          <h1>NEON AIR HOCKEY</h1>
          <p>
            High-speed glow-rink battles with responsive collision physics.
            <br />
            First to {MAX_SCORE} goals wins.
          </p>
          <div className="air-hockey-intro-grid">
            <button className="air-hockey-btn primary" onClick={() => startGame('ai')}>Start VS AI</button>
            <button className="air-hockey-btn secondary" onClick={() => startGame('local')}>Start Local 2P</button>
          </div>
          <div className="air-hockey-help">
            <div><strong>Player 1</strong>: W / A / S / D</div>
            <div><strong>Player 2</strong>: Arrow Keys</div>
          </div>
        </div>
      ) : (
        <>
          <div className="air-hockey-header">
            <div className="score-block pink">P1: {ui.leftScore}</div>
            <div className="mode-block">{mode === 'local' ? 'LOCAL 2P' : 'VS AI'}</div>
            <div className="score-block cyan">{mode === 'local' ? `P2: ${ui.rightScore}` : `AI: ${ui.rightScore}`}</div>
          </div>

          <div className="air-hockey-switch" role="group" aria-label="Air hockey mode switch">
            <button className={`air-hockey-btn mini ${mode === 'ai' ? 'active' : ''}`} onClick={() => switchModeInGame('ai')}>AI</button>
            <button className={`air-hockey-btn mini ${mode === 'local' ? 'active' : ''}`} onClick={() => switchModeInGame('local')}>Local 2P</button>
            <button className="air-hockey-btn mini" onClick={backToMenu}>Menu</button>
          </div>

          <div className="air-hockey-canvas-wrap">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="air-hockey-canvas" />

            {ui.gameOver && (
              <div className="air-hockey-overlay">
                <h2>{ui.winner} Wins</h2>
                <p>Final Score: {ui.leftScore} - {ui.rightScore}</p>
                <div className="air-hockey-overlay-actions">
                  <button className="air-hockey-btn primary" onClick={() => startGame(mode)}>Play Again</button>
                  <button className="air-hockey-btn mini" onClick={backToMenu}>Change Mode</button>
                </div>
              </div>
            )}
          </div>

          <div className="air-hockey-controls">
            {mode === 'local'
              ? 'Controls: P1 W/A/S/D, P2 Arrow Keys'
              : 'Controls: W/A/S/D. Defend left goal and score on the right.'}
          </div>

          {mode === 'local' && (
            <div className="air-hockey-touch-joysticks" role="group" aria-label="Local mobile joysticks">
              <div className="touch-stick-wrap">
                <span>P1</span>
                <div
                  className="touch-stick-base"
                  onPointerDown={(event) => handleJoystickPointerDown('left', event)}
                  onPointerMove={(event) => handleJoystickPointerMove('left', event)}
                  onPointerUp={(event) => handleJoystickPointerUp('left', event)}
                  onPointerCancel={(event) => handleJoystickPointerUp('left', event)}
                >
                  <div
                    className="touch-stick-thumb pink"
                    style={{ transform: `translate(${joystickUi.left.x}px, ${joystickUi.left.y}px)` }}
                  />
                </div>
              </div>

              <div className="touch-stick-wrap">
                <span>P2</span>
                <div
                  className="touch-stick-base"
                  onPointerDown={(event) => handleJoystickPointerDown('right', event)}
                  onPointerMove={(event) => handleJoystickPointerMove('right', event)}
                  onPointerUp={(event) => handleJoystickPointerUp('right', event)}
                  onPointerCancel={(event) => handleJoystickPointerUp('right', event)}
                >
                  <div
                    className="touch-stick-thumb cyan"
                    style={{ transform: `translate(${joystickUi.right.x}px, ${joystickUi.right.y}px)` }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
