import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './PrismBreak.css';

const CANVAS_W = 800;
const CANVAS_H = 600;

const LEVELS = [
  // Level 1: Standard Rows
  [
    '  XXXX  ',
    ' XXXXXX ',
    'XXXXXXXX',
    'XXXXXXXX'
  ],
  // Level 2: Diamond
  [
    '   XX   ',
    '  XXXX  ',
    ' XXXXXX ',
    'XXXXXXXX',
    ' XXXXXX ',
    '  XXXX  ',
    '   XX   '
  ],
  // Level 3: Gaps & Pillars
  [
    'X X X X ',
    ' X X X X',
    'X X X X ',
    'XXXXXXXX',
    'X      X',
    'X XXXXXX'
  ],
  // Level 4: The X
  [
    'X      X',
    ' X    X ',
    '  X  X  ',
    '   XX   ',
    '  X  X  ',
    ' X    X ',
    'X      X'
  ],
  // Level 5: Fortress
  [
    'XXXXXXXX',
    'X      X',
    'X XXXX X',
    'X X  X X',
    'X XXXX X',
    'X      X',
    'XXXXXXXX'
  ]
];

export default function PrismBreak() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['prism-break'] || 0;
  
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ score: 0, level: 1, over: false, won: false });
  const [showTutorial, setShowTutorial] = useState(true);

  const stateRef = useRef({
    paddle: { x: 350, y: 550, width: 120, height: 15, speed: 12 },
    ball: { x: 400, y: 530, vx: 4, vy: -4, radius: 8, speed: 6, trail: [] },
    bricks: [],
    particles: [],
    stars: Array.from({ length: 50 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.2
    })),
    keys: { ArrowLeft: false, ArrowRight: false, a: false, d: false },
    score: 0,
    level: 1,
    inPlay: false,
    shake: 0
  });

  const initBricks = (levelIndex) => {
    const layout = LEVELS[Math.min(levelIndex - 1, LEVELS.length - 1)];
    const bricks = [];
    const colors = ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF3D00'];
    
    const rows = layout.length;
    const cols = 8;
    const padding = 12;
    const w = (CANVAS_W - (padding * (cols + 1))) / cols;
    const h = 22;
    const startY = 80;

    layout.forEach((row, ri) => {
      [...row].forEach((char, ci) => {
        if (char === 'X') {
          bricks.push({
            x: padding + ci * (w + padding),
            y: startY + ri * (h + padding),
            w,
            h,
            color: colors[ri % colors.length],
            status: 1,
            pulse: 0
          });
        }
      });
    });
    return bricks;
  };

  const startGame = () => {
    const s = stateRef.current;
    s.score = 0;
    s.level = 1;
    s.bricks = initBricks(1);
    s.ball = { x: 400, y: 530, vx: 5, vy: -5, radius: 8, speed: 7, trail: [] };
    s.paddle = { x: 340, y: 550, width: 120, height: 15, speed: 12 };
    s.inPlay = false;
    setUiState({ score: 0, level: 1, over: false, won: false });
    setShowTutorial(false);
  };

  const nextLevel = () => {
    const s = stateRef.current;
    if (s.level >= LEVELS.length) {
      setUiState(prev => ({ ...prev, won: true }));
      return;
    }
    s.level++;
    s.bricks = initBricks(s.level);
    const speedInc = 7 + s.level;
    s.ball = { x: 400, y: 530, vx: speedInc * 0.7, vy: -speedInc * 0.7, radius: 8, speed: speedInc, trail: [] };
    s.inPlay = false;
    setUiState(prev => ({ ...prev, level: s.level }));
  };

  useEffect(() => {
    if (showTutorial) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const handleKey = (e, isDown) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) k.ArrowLeft = isDown;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) k.ArrowRight = isDown;
      if (isDown && e.key === ' ' && !stateRef.current.inPlay) stateRef.current.inPlay = true;
    };
    
    window.addEventListener('keydown', e => handleKey(e, true));
    window.addEventListener('keyup', e => handleKey(e, false));

    const loop = () => {
      const s = stateRef.current;
      
      if (!uiState.over && !uiState.won) {
        // Paddle movement
        if (s.keys.ArrowLeft) s.paddle.x -= s.paddle.speed;
        if (s.keys.ArrowRight) s.paddle.x += s.paddle.speed;
        s.paddle.x = Math.max(0, Math.min(CANVAS_W - s.paddle.width, s.paddle.x));

        // Screen shake decay
        if (s.shake > 0) s.shake *= 0.9;

        // Background stars
        s.stars.forEach(star => {
          star.y += star.speed;
          if (star.y > CANVAS_H) {
            star.y = -10;
            star.x = Math.random() * CANVAS_W;
          }
        });

        if (s.inPlay) {
          // Ball history for trail
          s.ball.trail.unshift({ x: s.ball.x, y: s.ball.y });
          if (s.ball.trail.length > 12) s.ball.trail.pop();

          s.ball.x += s.ball.vx;
          s.ball.y += s.ball.vy;

          // Wall bounces
          if (s.ball.x - s.ball.radius < 0 || s.ball.x + s.ball.radius > CANVAS_W) {
            s.ball.vx *= -1;
            s.shake = 5;
          }
          if (s.ball.y - s.ball.radius < 0) {
            s.ball.vy *= -1;
            s.shake = 5;
          }

          // Paddle collision
          if (s.ball.y + s.ball.radius > s.paddle.y && 
              s.ball.y < s.paddle.y + s.paddle.height &&
              s.ball.x > s.paddle.x && s.ball.x < s.paddle.x + s.paddle.width) {
            let hitPoint = (s.ball.x - (s.paddle.x + s.paddle.width/2)) / (s.paddle.width/2);
            s.ball.vx = hitPoint * s.ball.speed;
            s.ball.vy = -Math.sqrt(Math.abs(s.ball.speed**2 - s.ball.vx**2));
            s.ball.y = s.paddle.y - s.ball.radius; // Snap to top
            s.shake = 8;
          }

          // Game Over
          if (s.ball.y + s.ball.radius > CANVAS_H) {
            if (s.score > highScore) updateHighScore('prism-break', s.score);
            setUiState(prev => ({ ...prev, over: true }));
          }

          // Brick collision
          s.bricks.forEach(b => {
            if (b.status === 1) {
              if (s.ball.x + s.ball.radius > b.x && s.ball.x - s.ball.radius < b.x + b.w && 
                  s.ball.y + s.ball.radius > b.y && s.ball.y - s.ball.radius < b.y + b.h) {
                
                // Determine bounce side
                const overlapX = Math.min(s.ball.x + s.ball.radius - b.x, b.x + b.w - (s.ball.x - s.ball.radius));
                const overlapY = Math.min(s.ball.y + s.ball.radius - b.y, b.y + b.h - (s.ball.y - s.ball.radius));
                
                if (overlapX < overlapY) s.ball.vx *= -1;
                else s.ball.vy *= -1;

                b.status = 0;
                s.score += 20 * s.level;
                s.shake = 10;
                setUiState(prev => ({ ...prev, score: s.score }));
                
                // Explosion particles
                for(let i=0; i<12; i++) {
                  s.particles.push({
                    x: b.x + b.w/2,
                    y: b.y + b.h/2,
                    vx: (Math.random()-0.5)*12,
                    vy: (Math.random()-0.5)*12,
                    size: Math.random()*4 + 2,
                    life: 1,
                    color: b.color
                  });
                }
              }
            }
          });

          if (s.bricks.every(b => b.status === 0)) nextLevel();
        } else {
          s.ball.x = s.paddle.x + s.paddle.width / 2;
          s.ball.y = s.paddle.y - s.ball.radius;
          s.ball.trail = [];
        }

        // Particle update
        for(let i=s.particles.length-1; i>=0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.03;
          if (p.life <= 0) s.particles.splice(i, 1);
        }
      }

      // ── RENDERING ───────────────────────────────────────────────
      ctx.save();
      if (s.shake > 1) ctx.translate((Math.random()-0.5)*s.shake, (Math.random()-0.5)*s.shake);

      // Clearing with a trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      s.stars.forEach(star => {
        ctx.fillStyle = `rgba(255,255,255,${star.size/3})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Bricks (Glassmorphic)
      s.bricks.forEach(b => {
        if (b.status === 1) {
          const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
          grad.addColorStop(0, b.color);
          grad.addColorStop(1, 'rgba(0,0,0,0.4)');
          
          ctx.fillStyle = grad;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 4);
          ctx.fill();
          ctx.stroke();
          
          // Inner Shine
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.moveTo(b.x+4, b.y+4);
          ctx.lineTo(b.x + b.w-4, b.y+4);
          ctx.stroke();
        }
      });

      // Ball Trail
      s.ball.trail.forEach((t, i) => {
        const ratio = 1 - (i / s.ball.trail.length);
        ctx.beginPath();
        ctx.arc(t.x, t.y, s.ball.radius * ratio, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.4 * ratio})`;
        ctx.fill();
      });

      // Paddle
      const pGrad = ctx.createLinearGradient(s.paddle.x, s.paddle.y, s.paddle.x, s.paddle.y + s.paddle.height);
      pGrad.addColorStop(0, '#fff');
      pGrad.addColorStop(1, '#666');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(s.paddle.x, s.paddle.y, s.paddle.width, s.paddle.height, 8);
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fff';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Particles
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
      cancelAnimationFrame(animId);
    };
  }, [showTutorial, uiState.over, uiState.won, highScore, updateHighScore]);

  return (
    <div className="prism-break-container">
      {showTutorial ? (
        <div className="prism-overlay">
          <h1>PRISM BREAK</h1>
          <div className="tutorial-card">
            <p>Shatter the spectral prism fields. Navigate through 5 unique quantum layouts.</p>
            <ul>
              <li><Icon name="swap_horiz" /> <strong>MOVE:</strong> Arrow Keys / AD</li>
              <li><Icon name="rocket_launch" /> <strong>LAUNCH:</strong> Space Bar</li>
            </ul>
            <button className="start-btn" onClick={startGame}>INITIALIZE TRANSITION</button>
          </div>
        </div>
      ) : (
        <>
          <div className="prism-header">
            <div><Icon name="military_tech" /> SCORE: {uiState.score}</div>
            <div><Icon name="layers" /> LEVEL: {uiState.level} / {LEVELS.length}</div>
            <div><Icon name="workspace_premium" /> BEST: {highScore}</div>
          </div>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="prism-canvas" />
          
          {uiState.over && (
            <div className="prism-overlay">
              <h2 className="game-over-text">PRISM DE-SYNC</h2>
              <button className="start-btn" onClick={startGame}>RE-SYNC CORE</button>
            </div>
          )}

          {uiState.won && (
            <div className="prism-overlay">
              <h1 style={{ color: '#00FF00' }}>PRISM CLEANSED</h1>
              <p style={{ color: '#fff', fontSize: '1.5rem' }}>Full spectrum restored.</p>
              <button className="start-btn" onClick={startGame}>PLAY AGAIN</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Icon = ({ name }) => <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '4px', fontSize: '20px' }}>{name}</span>;

