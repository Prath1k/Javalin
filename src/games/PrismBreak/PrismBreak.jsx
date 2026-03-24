import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './PrismBreak.css';

const CANVAS_W = 800;
const CANVAS_H = 600;

export default function PrismBreak() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['prism-break'] || 0;
  
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ score: 0, level: 1, over: false, won: false });
  const [showTutorial, setShowTutorial] = useState(true);

  const stateRef = useRef({
    paddle: { x: 350, y: 550, width: 100, height: 15, speed: 10 },
    ball: { x: 400, y: 530, vx: 4, vy: -4, radius: 8, speed: 6 },
    bricks: [],
    particles: [],
    keys: { ArrowLeft: false, ArrowRight: false, a: false, d: false },
    score: 0,
    level: 1,
    inPlay: false
  });

  const initBricks = (level) => {
    const rows = 3 + level;
    const cols = 8;
    const padding = 10;
    const w = (CANVAS_W - (padding * (cols + 1))) / cols;
    const h = 25;
    const bricks = [];
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: padding + c * (w + padding),
          y: 60 + r * (h + padding),
          w,
          h,
          color: colors[r % colors.length],
          status: 1
        });
      }
    }
    return bricks;
  };

  const startGame = () => {
    const s = stateRef.current;
    s.score = 0;
    s.level = 1;
    s.bricks = initBricks(1);
    s.ball = { x: 400, y: 530, vx: 4, vy: -4, radius: 8, speed: 6 };
    s.paddle = { x: 350, y: 550, width: 100, height: 15, speed: 10 };
    s.inPlay = false;
    setUiState({ score: 0, level: 1, over: false, won: false });
    setShowTutorial(false);
  };

  const nextLevel = () => {
    const s = stateRef.current;
    s.level++;
    s.bricks = initBricks(s.level);
    s.ball = { x: 400, y: 530, vx: 4 + s.level, vy: -(4 + s.level), radius: 8, speed: 6 + s.level };
    s.inPlay = false;
    setUiState(prev => ({ ...prev, level: s.level }));
  };

  useEffect(() => {
    if (showTutorial) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const keyD = e => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) k.ArrowLeft = true;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) k.ArrowRight = true;
      if (e.key === ' ' && !stateRef.current.inPlay) stateRef.current.inPlay = true;
    };
    const keyU = e => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) k.ArrowLeft = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) k.ArrowRight = false;
    };
    window.addEventListener('keydown', keyD);
    window.addEventListener('keyup', keyU);

    const loop = () => {
      const s = stateRef.current;
      if (!uiState.over && !uiState.won) {
        // Paddle move
        if (s.keys.ArrowLeft) s.paddle.x -= s.paddle.speed;
        if (s.keys.ArrowRight) s.paddle.x += s.paddle.speed;
        if (s.paddle.x < 0) s.paddle.x = 0;
        if (s.paddle.x > CANVAS_W - s.paddle.width) s.paddle.x = CANVAS_W - s.paddle.width;

        if (s.inPlay) {
          s.ball.x += s.ball.vx;
          s.ball.y += s.ball.vy;

          // Wall bounce
          if (s.ball.x - s.ball.radius < 0 || s.ball.x + s.ball.radius > CANVAS_W) s.ball.vx *= -1;
          if (s.ball.y - s.ball.radius < 0) s.ball.vy *= -1;

          // Paddle bounce
          if (s.ball.y + s.ball.radius > s.paddle.y && 
              s.ball.x > s.paddle.x && s.ball.x < s.paddle.x + s.paddle.width) {
            let hitPoint = (s.ball.x - (s.paddle.x + s.paddle.width/2)) / (s.paddle.width/2);
            s.ball.vx = hitPoint * s.ball.speed;
            s.ball.vy = -Math.sqrt(Math.abs(s.ball.speed**2 - s.ball.vx**2));
          }

          // Floor
          if (s.ball.y + s.ball.radius > CANVAS_H) {
            if (s.score > highScore) updateHighScore('prism-break', s.score);
            setUiState(prev => ({ ...prev, over: true }));
          }

          // Brick collision
          s.bricks.forEach(b => {
            if (b.status === 1) {
              if (s.ball.x > b.x && s.ball.x < b.x + b.w && 
                  s.ball.y - s.ball.radius < b.y + b.h && s.ball.y + s.ball.radius > b.y) {
                s.ball.vy *= -1;
                b.status = 0;
                s.score += 10;
                setUiState(prev => ({ ...prev, score: s.score }));
                
                // Particles
                for(let i=0; i<8; i++) {
                  s.particles.push({
                    x: b.x + b.w/2,
                    y: b.y + b.h/2,
                    vx: (Math.random()-0.5)*8,
                    vy: (Math.random()-0.5)*8,
                    life: 1,
                    color: b.color
                  });
                }
              }
            }
          });

          if (s.bricks.every(b => b.status === 0)) {
            nextLevel();
          }
        } else {
          s.ball.x = s.paddle.x + s.paddle.width / 2;
          s.ball.y = s.paddle.y - s.ball.radius;
        }

        // Particles update
        for(let i=s.particles.length-1; i>=0; i--) {
          s.particles[i].x += s.particles[i].vx;
          s.particles[i].y += s.particles[i].vy;
          s.particles[i].life -= 0.04;
          if (s.particles[i].life <= 0) s.particles.splice(i, 1);
        }
      }

      // Draw
      ctx.fillStyle = 'rgba(10, 10, 20, 0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Bricks
      s.bricks.forEach(b => {
        if (b.status === 1) {
          ctx.fillStyle = b.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.shadowBlur = 0;
        }
      });

      // Paddle
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fff';
      ctx.fillRect(s.paddle.x, s.paddle.y, s.paddle.width, s.paddle.height);

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.closePath();

      // Particles
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('keydown', keyD);
      window.removeEventListener('keyup', keyU);
      cancelAnimationFrame(animId);
    };
  }, [showTutorial, uiState.over, uiState.won, highScore, updateHighScore]);

  return (
    <div className="prism-break-container">
      {showTutorial ? (
        <div className="prism-overlay">
          <h1>PRISM BREAK</h1>
          <div className="tutorial-card">
            <p>Demolish the spectral field. Do not allow the core to breach the lower perimeter.</p>
            <ul>
              <li><strong>Move:</strong> Arrow Keys or A/D</li>
              <li><strong>Launch:</strong> Space</li>
            </ul>
            <button className="start-btn" onClick={startGame}>INITIALIZE</button>
          </div>
        </div>
      ) : (
        <>
          <div className="prism-header">
            <div>SCORE: {uiState.score}</div>
            <div>LEVEL: {uiState.level}</div>
            <div>HIGH SCORE: {highScore}</div>
          </div>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="prism-canvas" />
          {uiState.over && (
            <div className="prism-overlay">
              <h2 className="game-over-text">CORE LOST</h2>
              <button className="start-btn" onClick={startGame}>RETRY</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
