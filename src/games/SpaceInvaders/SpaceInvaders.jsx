import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './SpaceInvaders.css';

const ENEMY_TYPES = ['squid', 'crab', 'octopus', 'ufo'];
const ALIEN_COLORS = { squid: '#ff0055', crab: '#00ffcc', octopus: '#cc00ff', ufo: '#ffea00' };

export default function SpaceInvaders() {
  const { highScores, updateHighScore, guestId } = useScores();
  const highScore = highScores['space-invaders'] || 0;
  
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ score: 0, level: 1, over: false });
  const [showTutorial, setShowTutorial] = useState(true);

  const stateRef = useRef({
    player: { x: 375, y: 550, width: 44, height: 24, speed: 6, dx: 0 },
    bullets: [],
    alienBullets: [],
    aliens: [],
    particles: [],
    stars: [],
    score: 0,
    level: 1,
    alienDirection: 1,
    alienSpeed: 1,
    lastAlienFire: 0,
    isGameOver: false,
    keys: { ArrowLeft: false, ArrowRight: false, a: false, d: false, Space: false }
  });

  const initLevel = (lvl) => {
    const aliens = [];
    const rows = Math.min(4 + Math.floor(lvl / 2), 7);
    const cols = Math.min(8 + Math.floor(lvl / 3), 12);
    
    const types = ['ufo', 'squid', 'crab', 'octopus'];
    for (let r = 0; r < rows; r++) {
      let tIdx = r % types.length;
      for (let c = 0; c < cols; c++) {
        aliens.push({
          x: c * 45 + (800 - (cols*45))/2,
          y: r * 40 + 60,
          width: 28, height: 28, alive: true,
          type: types[tIdx],
          offsetY: Math.random() * Math.PI * 2
        });
      }
    }
    
    let stars = [];
    for(let i=0; i<100; i++) {
        stars.push({
            x: Math.random() * 800, y: Math.random() * 600,
            s: Math.random() * 2 + 0.5,
            dy: Math.random() * 2 + 0.2
        });
    }

    stateRef.current.aliens = aliens;
    stateRef.current.bullets = [];
    stateRef.current.alienBullets = [];
    stateRef.current.particles = [];
    stateRef.current.stars = stars;
    stateRef.current.alienSpeed = 1 + (lvl * 0.3);
    stateRef.current.alienDirection = 1;
    stateRef.current.lastAlienFire = Date.now();
  };

  const startGame = () => {
    stateRef.current.score = 0;
    stateRef.current.level = 1;
    stateRef.current.isGameOver = false;
    stateRef.current.player.x = 375;
    initLevel(1);
    setUiState({ score: 0, level: 1, over: false });
    setShowTutorial(false);
  };

  const setMoveKey = (direction, isPressed) => {
    const k = stateRef.current.keys;
    if (direction === 'left') k.ArrowLeft = isPressed;
    if (direction === 'right') k.ArrowRight = isPressed;
  };

  const fireLaser = () => {
    const s = stateRef.current;
    if (s.bullets.length < 3 && !s.isGameOver) {
      s.bullets.push({
        x: s.player.x + 20,
        y: s.player.y,
        width: 4,
        height: 16,
        speed: 10,
      });
    }
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
      if ([' ', 'Spacebar'].includes(e.key)) {
        k.Space = true;
        fireLaser();
      }
    };
    const keyU = e => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) k.ArrowLeft = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) k.ArrowRight = false;
      if ([' ', 'Spacebar'].includes(e.key)) k.Space = false;
    };
    window.addEventListener('keydown', keyD);
    window.addEventListener('keyup', keyU);

    const checkOver = () => {
        if(stateRef.current.isGameOver) {
            updateHighScore('space-invaders', stateRef.current.score);
            setUiState(prev => ({ ...prev, over: true }));
        }
    };

    const loop = () => {
      const s = stateRef.current;
      if (!s.isGameOver) {
        if (s.keys.ArrowLeft) s.player.x -= s.player.speed;
        if (s.keys.ArrowRight) s.player.x += s.player.speed;
        if (s.player.x < 0) s.player.x = 0;
        if (s.player.x > 800 - s.player.width) s.player.x = 800 - s.player.width;

        s.stars.forEach(st => {
            st.y += st.dy;
            if(st.y > 600) { st.y = 0; st.x = Math.random()*800; }
        });

        s.bullets.forEach((b, i) => {
          b.y -= b.speed;
          if (b.y < -20) s.bullets.splice(i, 1);
        });

        s.alienBullets.forEach((b, i) => {
          b.y += b.speed;
          if (b.y > 620) s.alienBullets.splice(i, 1);
        });

        let hitEdge = false, aliveCount = 0;
        s.aliens.forEach(a => {
          if (!a.alive) return;
          aliveCount++;
          a.x += (s.alienSpeed * s.alienDirection);
          a.offsetY += 0.05;
          if (a.x <= 10 || a.x + a.width >= 790) hitEdge = true;
          if (a.y + a.height > s.player.y) s.isGameOver = true;
        });

        if (aliveCount === 0) {
            s.level++;
            setUiState(p => ({ ...p, level: s.level }));
            initLevel(s.level);
            return (animId = requestAnimationFrame(loop));
        }

        if (hitEdge) {
          s.alienDirection *= -1;
          s.alienSpeed += 0.15;
          s.aliens.forEach(a => { if(a.alive) a.y += 20; });
        }

        if (Date.now() - s.lastAlienFire > Math.max(300, 1200 - (s.level*100))) {
          const active = s.aliens.filter(x => x.alive);
          if (active.length > 0) {
            const rand = active[Math.floor(Math.random()*active.length)];
            s.alienBullets.push({ x: rand.x+12, y: rand.y+20, width: 4, height: 12, speed: 5 + s.level*0.5 });
            s.lastAlienFire = Date.now();
          }
        }

        for (let i = s.bullets.length - 1; i >= 0; i--) {
          let b = s.bullets[i];
          let hit = false;
          for (let a of s.aliens) {
            if (a.alive && b.x < a.x+a.width && b.x+b.width > a.x && b.y < a.y+a.height && b.y+b.height > a.y) {
              a.alive = false; hit = true;
              s.score += (a.type==="ufo"?50 : a.type==="squid"?30 : 10);
              for(let k=0; k<8; k++) s.particles.push({
                  x: a.x+14, y: a.y+14, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
                  life: 1, col: ALIEN_COLORS[a.type]
              });
              break;
            }
          }
          if (hit) s.bullets.splice(i, 1);
        }

        for (let b of s.alienBullets) {
          if (b.x < s.player.x+s.player.width && b.x+b.width > s.player.x && b.y < s.player.y+s.player.height && b.y+b.height > s.player.y) {
            s.isGameOver = true;
            for(let k=0; k<20; k++) s.particles.push({
                x: s.player.x+20, y: s.player.y+10, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                life: 1, col: '#00ffcc'
            });
            break;
          }
        }

        for(let i=s.particles.length-1; i>=0; i--){
            s.particles[i].x += s.particles[i].vx;
            s.particles[i].y += s.particles[i].vy;
            s.particles[i].life -= 0.03;
            if(s.particles[i].life<=0) s.particles.splice(i, 1);
        }
        
        checkOver();
        setUiState(p => ({ ...p, score: s.score }));
      }

      ctx.fillStyle = 'rgba(5, 5, 15, 0.4)';
      ctx.fillRect(0, 0, 800, 600);

      s.stars.forEach(st => {
          ctx.fillStyle = `rgba(255, 255, 255, ${st.dy/3})`;
          ctx.fillRect(st.x, st.y, st.s, st.s);
      });

      if (!s.isGameOver) {
          ctx.fillStyle = '#00ffcc';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ffcc';
          ctx.beginPath();
          ctx.moveTo(s.player.x + 22, s.player.y);
          ctx.lineTo(s.player.x + s.player.width, s.player.y + s.player.height);
          ctx.lineTo(s.player.x, s.player.y + s.player.height);
          ctx.fill();
          ctx.shadowBlur = 0;
      }

      s.aliens.forEach(a => {
        if (!a.alive) return;
        let pY = a.y + Math.sin(a.offsetY)*5;
        ctx.fillStyle = ALIEN_COLORS[a.type];
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(a.x, pY, a.width, a.height);
        
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(a.x+6, pY+6, 4, 4);
        ctx.fillRect(a.x+18, pY+6, 4, 4);
        ctx.shadowBlur = 0;
      });

      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      s.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
      
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      s.alienBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
      
      ctx.shadowBlur = 0;
      s.particles.forEach(p => {
        ctx.fillStyle = p.col;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('keydown', keyD);
      window.removeEventListener('keyup', keyU);
      cancelAnimationFrame(animId);
    };
  }, [showTutorial, updateHighScore]);

  return (
    <div className="space-invaders-container">
      {showTutorial ? (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 'clamp(16px, 4vw, 32px)', textAlign: 'center'
        }}>
          <h1 style={{ color: '#00ffcc', textShadow: '0 0 15px #00ffcc', marginBottom: 24, fontSize: 'clamp(1.8rem, 8vw, 3rem)' }}>SPACE INVADERS 2.0</h1>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', maxWidth: 560, width: '100%' }}>
            <h3 style={{ marginBottom: 16, color: 'var(--text-primary)' }}>Threat Assessment</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              Intergalactic armada detected. Protect the sector by clearing waves of entities. The swarm intensifies after each iteration.
            </p>
            <ul style={{ color: 'var(--text-muted)', textAlign: 'left', marginBottom: 24, lineHeight: 1.6, paddingLeft: 24 }}>
              <li><strong>Move:</strong> <kbd>A</kbd> <kbd>D</kbd> or Left/Right Arrows</li>
              <li><strong>Fire:</strong> <kbd>SPACE</kbd> (3 active pulses max)</li>
              <li><strong style={{color: '#ffea00'}}>Command UFO</strong>: High value target (+50 pts)</li>
              <li><strong style={{color: '#ff0055'}}>Squid Class</strong>: Standard threat (+30 pts)</li>
            </ul>
            <button className="sign-in-btn" onClick={startGame} style={{
              width: '100%', padding: '16px', borderRadius: 8, background: '#00ffcc',
              color: '#000', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 255, 204, 0.4)'
            }}>DEPLOY FIGHTER</button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-invaders-header">
            <div>RATING: {uiState.score}</div>
            <div style={{color: 'var(--primary-color)'}}>WAVE: {uiState.level}</div>
            <div className="high-score-display">TOP ACCURACY: {highScore}</div>
          </div>
          
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} width={800} height={600} className="space-invaders-canvas" />
            
            {uiState.over && (
              <div className="game-over-overlay" style={{ boxShadow: '0 0 30px #00ffcc' }}>
                <h2 style={{ color: '#00ffcc', textShadow: '0 0 10px #00ffcc' }}>SIGNAL LOST</h2>
                <p>Entities Cleared: {uiState.score}</p>
                <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 8}}>Survived until Wave {uiState.level}</p>
                <button className="pacman-btn" onClick={startGame} style={{marginTop: 16}}>RE-DEPLOY</button>
              </div>
            )}
          </div>

          <div className="space-controls-hint game-controls-hint">Desktop: A/D or Arrow Keys to move, Space to fire. Mobile: use control pad.</div>

          <div className="space-mobile-controls game-touch-controls" role="group" aria-label="Space Invaders touch controls">
            <button
              className="space-ctrl-btn game-touch-btn compact"
              onPointerDown={(e) => { e.preventDefault(); setMoveKey('left', true); }}
              onPointerUp={() => setMoveKey('left', false)}
              onPointerCancel={() => setMoveKey('left', false)}
              onPointerLeave={() => setMoveKey('left', false)}
            >
              ◀
            </button>
            <button
              className="space-ctrl-btn fire game-touch-btn"
              onPointerDown={(e) => { e.preventDefault(); fireLaser(); }}
            >
              FIRE
            </button>
            <button
              className="space-ctrl-btn game-touch-btn compact"
              onPointerDown={(e) => { e.preventDefault(); setMoveKey('right', true); }}
              onPointerUp={() => setMoveKey('right', false)}
              onPointerCancel={() => setMoveKey('right', false)}
              onPointerLeave={() => setMoveKey('right', false)}
            >
              ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
}
