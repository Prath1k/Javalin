import React, { useRef, useEffect, useState } from 'react';
import './NeonPong.css';

const NeonPong = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [aiMode, setAiMode] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(null);
  const [rallies, setRallies] = useState(0);

  const WIDTH = 800;
  const HEIGHT = 600;
  const PADDLE_WIDTH = 15;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 12;
  const PADDLE_SPEED = 8;
  const INITIAL_BALL_SPEED = 6;
  const MAX_BALL_SPEED = 15;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const state = {
      p1: { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      p2: { y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
      ball: {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        dy: INITIAL_BALL_SPEED * (Math.random() * 2 - 1),
        speed: INITIAL_BALL_SPEED
      },
      keys: { w: false, s: false, ArrowUp: false, ArrowDown: false },
      particles: [],
      trail: [],
      rallyCount: 0,
    };

    const handleKeyDown = (e) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        state.keys[e.key] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        state.keys[e.key] = false;
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const createParticles = (x, y, color, count = 5) => {
      for (let i = 0; i < count; i++) {
        state.particles.push({
          x, y,
          dx: (Math.random() - 0.5) * 10,
          dy: (Math.random() - 0.5) * 10,
          life: 1,
          color
        });
      }
    };

    const resetBall = (scorer) => {
      if (scorer === 'p1') state.p1.score++;
      if (scorer === 'p2') state.p2.score++;
      setScores({ p1: state.p1.score, p2: state.p2.score });
      setScoreFlash(scorer);
      setTimeout(() => setScoreFlash(null), 400);
      setRallies(state.rallyCount);
      state.rallyCount = 0;

      state.ball.x = WIDTH / 2;
      state.ball.y = HEIGHT / 2;
      state.ball.speed = INITIAL_BALL_SPEED;
      state.ball.dx = INITIAL_BALL_SPEED * (scorer === 'p1' ? -1 : 1);
      state.ball.dy = INITIAL_BALL_SPEED * (Math.random() * 2 - 1);
      state.trail = [];
    };

    const update = () => {
      if (!isPlaying) return;

      // P1 controls
      if (state.keys.w && state.p1.y > 0) state.p1.y -= PADDLE_SPEED;
      if (state.keys.s && state.p1.y < HEIGHT - PADDLE_HEIGHT) state.p1.y += PADDLE_SPEED;

      // P2 controls or AI
      if (aiMode) {
        const centerP2 = state.p2.y + PADDLE_HEIGHT / 2;
        const target = state.ball.y + BALL_SIZE / 2;
        const aiSpeed = PADDLE_SPEED * 0.7;
        if (centerP2 < target - 10) state.p2.y = Math.min(state.p2.y + aiSpeed, HEIGHT - PADDLE_HEIGHT);
        else if (centerP2 > target + 10) state.p2.y = Math.max(state.p2.y - aiSpeed, 0);
      } else {
        if (state.keys.ArrowUp && state.p2.y > 0) state.p2.y -= PADDLE_SPEED;
        if (state.keys.ArrowDown && state.p2.y < HEIGHT - PADDLE_HEIGHT) state.p2.y += PADDLE_SPEED;
      }

      // Ball trail
      state.trail.push({ x: state.ball.x, y: state.ball.y });
      if (state.trail.length > 8) state.trail.shift();

      // Move Ball
      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;

      // Wall collisions
      if (state.ball.y <= 0 || state.ball.y >= HEIGHT - BALL_SIZE) {
        state.ball.dy *= -1;
        createParticles(state.ball.x, state.ball.y, '#fff', 3);
      }

      // P1 collision
      if (
        state.ball.x <= PADDLE_WIDTH * 2 &&
        state.ball.y + BALL_SIZE >= state.p1.y &&
        state.ball.y <= state.p1.y + PADDLE_HEIGHT
      ) {
        state.ball.dx = Math.abs(state.ball.dx);
        let hitPoint = (state.ball.y - (state.p1.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        state.ball.dy = hitPoint * state.ball.speed;
        state.ball.speed = Math.min(state.ball.speed + 0.5, MAX_BALL_SPEED);
        state.ball.dx = state.ball.speed;
        state.rallyCount++;
        createParticles(state.ball.x, state.ball.y, '#00ffcc', 10);
      }

      // P2 collision
      if (
        state.ball.x + BALL_SIZE >= WIDTH - PADDLE_WIDTH * 2 &&
        state.ball.y + BALL_SIZE >= state.p2.y &&
        state.ball.y <= state.p2.y + PADDLE_HEIGHT
      ) {
        state.ball.dx = -Math.abs(state.ball.dx);
        let hitPoint = (state.ball.y - (state.p2.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        state.ball.dy = hitPoint * state.ball.speed;
        state.ball.speed = Math.min(state.ball.speed + 0.5, MAX_BALL_SPEED);
        state.ball.dx = -state.ball.speed;
        state.rallyCount++;
        createParticles(state.ball.x, state.ball.y, '#ff00cc', 10);
      }

      // Scoring
      if (state.ball.x < 0) resetBall('p2');
      if (state.ball.x > WIDTH) resetBall('p1');

      state.particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.life -= 0.05;
      });
      state.particles = state.particles.filter(p => p.life > 0);
    };

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    };

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Center Line
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, 0);
      ctx.lineTo(WIDTH / 2, HEIGHT);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();
      ctx.setLineDash([]);

      if (isPlaying) {
        // P1 Paddle
        ctx.fillStyle = '#00ffcc';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffcc';
        drawRoundedRect(ctx, PADDLE_WIDTH, state.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);

        // P2 Paddle
        ctx.fillStyle = '#ff00cc';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff00cc';
        drawRoundedRect(ctx, WIDTH - PADDLE_WIDTH * 2, state.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT, 5);

        // Ball Trail
        state.trail.forEach((t, i) => {
          const alpha = (i / state.trail.length) * 0.3;
          ctx.fillStyle = state.ball.dx > 0 ? `rgba(255, 0, 204, ${alpha})` : `rgba(0, 255, 204, ${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x + BALL_SIZE / 2, t.y + BALL_SIZE / 2, BALL_SIZE / 2 * (i / state.trail.length), 0, Math.PI * 2);
          ctx.fill();
        });

        // Ball
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = state.ball.dx > 0 ? '#ff00cc' : '#00ffcc';
        ctx.beginPath();
        ctx.arc(state.ball.x + BALL_SIZE / 2, state.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Rally counter on canvas
        if (state.rallyCount > 2) {
          ctx.shadowBlur = 0;
          ctx.font = '14px "Space Grotesk", monospace';
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, state.rallyCount / 10)})`;
          ctx.textAlign = 'center';
          ctx.fillText(`RALLY x${state.rallyCount}`, WIDTH / 2, 30);
        }

        // Particles
        state.particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = '30px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillText('NEON PONG.EXE', WIDTH / 2, HEIGHT / 2 - 20);
        ctx.font = '16px monospace';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#888';
        ctx.fillText('PRESS [SPACE] TO START', WIDTH / 2, HEIGHT / 2 + 20);
      }
    };

    const loop = () => {
      update();
      render();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    const handleSpacebar = (e) => {
      if (e.code === 'Space' && !isPlaying) {
        setIsPlaying(true);
      }
    };
    window.addEventListener('keydown', handleSpacebar);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleSpacebar);
    };
  }, [isPlaying, aiMode]);

  return (
    <div className={`neon-pong-container ${scoreFlash ? `flash-${scoreFlash}` : ''}`} ref={containerRef}>
      <div className="pong-header">
        <div className="score p1-score">{scores.p1}</div>
        <div className="pong-center">
          <div className="pong-title">PONG_PROTOCOL</div>
          {rallies > 3 && <div className="rally-badge">Last Rally: x{rallies}</div>}
        </div>
        <div className="score p2-score">{scores.p2}</div>
      </div>

      {/* AI Toggle */}
      <div className="pong-mode-toggle">
        <button
          className={`mode-btn ${!aiMode ? 'active' : ''}`}
          onClick={() => setAiMode(false)}
        >
          2P LOCAL
        </button>
        <button
          className={`mode-btn ${aiMode ? 'active' : ''}`}
          onClick={() => setAiMode(true)}
        >
          VS CPU
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="pong-canvas"
      />
      <div className="pong-instructions">
        <span>PLAYER 1: [W] / [S]</span>
        <span>{aiMode ? 'CPU CONTROLLED' : 'PLAYER 2: [UP] / [DOWN]'}</span>
      </div>
    </div>
  );
};

export default NeonPong;
