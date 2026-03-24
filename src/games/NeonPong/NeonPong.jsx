import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './NeonPong.css';

export default function NeonPong() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['neon-pong'] || 0;
  
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ score: 0, aiScore: 0, level: 1, over: false });
  const [showTutorial, setShowTutorial] = useState(true);

  const stateRef = useRef({
    player: { y: 250, height: 100, width: 15, x: 20, speed: 8 },
    ai: { y: 250, height: 100, width: 15, x: 765, speed: 5 },
    ball: { x: 400, y: 300, vx: 5, vy: 5, radius: 10, speed: 7 },
    particles: [],
    score: 0,
    aiScore: 0,
    rally: 0,
    keys: { ArrowUp: false, ArrowDown: false, w: false, s: false }
  });

  const startGame = () => {
    stateRef.current.score = 0;
    stateRef.current.aiScore = 0;
    stateRef.current.rally = 0;
    stateRef.current.ai.speed = 5;
    stateRef.current.ball = { x: 400, y: 300, vx: 5, vy: 5, radius: 10, speed: 7 };
    setUiState({ score: 0, aiScore: 0, level: 1, over: false });
    setShowTutorial(false);
  };

  const setPaddleKey = (direction, isPressed) => {
    const k = stateRef.current.keys;
    if (direction === 'up') k.ArrowUp = isPressed;
    if (direction === 'down') k.ArrowDown = isPressed;
  };

  const endRally = (winner) => {
      const s = stateRef.current;
      if (winner === 'player') {
          s.score++;
          s.rally++;
      } else {
          s.aiScore++;
          if (s.score > highScore) {
              updateHighScore('neon-pong', s.score);
          }
          setUiState(p => ({ ...p, over: true }));
          return;
      }
      
      const dirX = winner === 'player' ? -1 : 1;
      s.ball = { x: 400, y: 300, vx: dirX * (5 + (s.rally*0.5)), vy: (Math.random()>0.5?1:-1) * (5 + (s.rally*0.3)), radius: 10, speed: 7 + (s.rally*0.5) };
      s.ai.speed = 4.5 + (s.rally * 0.4);
      setUiState(p => ({ ...p, score: s.score, aiScore: s.aiScore, level: s.rally + 1 }));
  };

  useEffect(() => {
    if (showTutorial) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const keyD = e => {
      const k = stateRef.current.keys;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) k.ArrowUp = true;
      if (['ArrowDown', 's', 'S'].includes(e.key)) k.ArrowDown = true;
    };
    const keyU = e => {
      const k = stateRef.current.keys;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) k.ArrowUp = false;
      if (['ArrowDown', 's', 'S'].includes(e.key)) k.ArrowDown = false;
    };
    window.addEventListener('keydown', keyD);
    window.addEventListener('keyup', keyU);

    const checkCollision = (b, paddle) => {
        return (
            b.x - b.radius < paddle.x + paddle.width &&
            b.x + b.radius > paddle.x &&
            b.y - b.radius < paddle.y + paddle.height &&
            b.y + b.radius > paddle.y
        );
    };

    const loop = () => {
      const s = stateRef.current;
      if (!uiState.over) {
        
        if (s.keys.ArrowUp) s.player.y -= s.player.speed;
        if (s.keys.ArrowDown) s.player.y += s.player.speed;
        if (s.player.y < 0) s.player.y = 0;
        if (s.player.y > 600 - s.player.height) s.player.y = 600 - s.player.height;

        
        const aiCenter = s.ai.y + (s.ai.height/2);
        if (aiCenter < s.ball.y - 10) s.ai.y += s.ai.speed;
        else if (aiCenter > s.ball.y + 10) s.ai.y -= s.ai.speed;
        
        if (s.ai.y < 0) s.ai.y = 0;
        if (s.ai.y > 600 - s.ai.height) s.ai.y = 600 - s.ai.height;

        
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;

        
        if (s.ball.y - s.ball.radius < 0 || s.ball.y + s.ball.radius > 600) {
            s.ball.vy *= -1;
        }

        
        let hitPaddle = checkCollision(s.ball, s.player) ? 'player' : checkCollision(s.ball, s.ai) ? 'ai' : null;
        
        if (hitPaddle) {
            const paddle = hitPaddle === 'player' ? s.player : s.ai;
            let collidePoint = s.ball.y - (paddle.y + paddle.height/2);
            collidePoint = collidePoint / (paddle.height/2);
            const angleRad = (Math.PI/4) * collidePoint;
            
            const dirX = hitPaddle === 'player' ? 1 : -1;
            s.ball.vx = dirX * s.ball.speed * Math.cos(angleRad);
            s.ball.vy = s.ball.speed * Math.sin(angleRad);
            s.ball.speed += 0.5;

            
            for(let k=0; k<15; k++) {
                s.particles.push({
                    x: hitPaddle === 'player' ? paddle.x + paddle.width : paddle.x,
                    y: s.ball.y,
                    vx: (Math.random()-0.5)*10 + (dirX*5),
                    vy: (Math.random()-0.5)*10,
                    life: 1,
                    col: hitPaddle === 'player' ? '#ff00ff' : '#00ffff'
                });
            }
        }

        
        if (s.ball.x - s.ball.radius < -20) endRally('ai');
        else if (s.ball.x + s.ball.radius > 820) endRally('player');

        
        for(let i=s.particles.length-1; i>=0; i--){
            s.particles[i].x += s.particles[i].vx;
            s.particles[i].y += s.particles[i].vy;
            s.particles[i].life -= 0.05;
            if(s.particles[i].life<=0) s.particles.splice(i, 1);
        }
      }

      
      ctx.fillStyle = 'rgba(10, 10, 20, 0.4)';
      ctx.fillRect(0, 0, 800, 600);

      
      ctx.setLineDash([15, 15]);
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 600);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();
      ctx.setLineDash([]);

      if (!uiState.over) {
          
          ctx.fillStyle = '#ff00ff';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff00ff';
          ctx.fillRect(s.player.x, s.player.y, s.player.width, s.player.height);
          
          
          ctx.fillStyle = '#00ffff';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ffff';
          ctx.fillRect(s.ai.x, s.ai.y, s.ai.width, s.ai.height);

          
          ctx.beginPath();
          ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI*2);
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#fff';
          ctx.fill();
          ctx.closePath();
      }

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
  }, [showTutorial, uiState.over, updateHighScore, highScore]);

  return (
    <div className="neon-pong-container">
      {showTutorial ? (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-base)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 'clamp(16px, 4vw, 32px)', textAlign: 'center'
        }}>
          <h1 style={{ color: '#ff00ff', textShadow: '0 0 20px #ff00ff', marginBottom: 24, fontSize: 'clamp(2rem, 9vw, 3.5rem)', fontStyle: 'italic' }}>NEON PONG</h1>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 16, border: '1px solid #330033', maxWidth: 560, width: '100%' }}>
            <h3 style={{ marginBottom: 16, color: '#fff' }}>Protocol: Endless AI Volley</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Deflect the core back to the synthetic intelligence. The rally speed and AI tracking algorithm will intensify after every successful volley. 
              <br /><br />
              <strong>Missing a single return terminates the connection.</strong>
            </p>
            <ul style={{ color: '#ff00ff', textAlign: 'left', marginBottom: 24, lineHeight: 1.6, paddingLeft: 24, fontWeight: 'bold' }}>
              <li><strong>Move Up:</strong> <kbd>W</kbd> or Up Arrow</li>
              <li><strong>Move Down:</strong> <kbd>S</kbd> or Down Arrow</li>
              <li>Ball accelerates progressively per hit</li>
            </ul>
            <button className="sign-in-btn" onClick={startGame} style={{
              width: '100%', padding: '16px', borderRadius: 8, background: '#ff00ff',
              color: '#000', fontWeight: 'bold', fontSize: '1.2rem', border: 'none', cursor: 'pointer',
              boxShadow: '0 0 25px rgba(255, 0, 255, 0.5)'
            }}>INITIALIZE SEQUENCE</button>
          </div>
        </div>
      ) : (
        <>
          <div className="neon-pong-header">
            <div style={{color: '#ff00ff', textShadow: '0 0 10px #ff00ff'}}>HITS: {uiState.score}</div>
            <div style={{color: '#fff'}}>SPEED VOLLEY {uiState.level}</div>
            <div className="high-score-display" style={{color: '#00ffff'}}>SYSTEM MAX: {highScore}</div>
          </div>
          
          <div className="canvas-wrapper-pong">
            <canvas ref={canvasRef} width={800} height={600} className="neon-pong-canvas" />
            
            {uiState.over && (
              <div className="game-over-overlay" style={{ border: '1px solid #ff00ff', boxShadow: '0 0 30px rgba(255, 0, 255, 0.4)' }}>
                <h2 style={{ color: '#ff00ff', textShadow: '0 0 15px #ff00ff' }}>CONNECTION SEVERED</h2>
                <p>Total Volleys: {uiState.score}</p>
                <button className="pacman-btn" style={{background: '#ff00ff', boxShadow: '0 0 15px rgba(255,0,255,0.4)', marginTop: 24}} onClick={startGame}>RECONNECT</button>
              </div>
            )}
          </div>

          <div className="pong-controls-hint game-controls-hint">Desktop: W/S or Arrow Keys. Mobile: hold UP or DOWN.</div>

          <div className="pong-mobile-controls game-touch-controls" role="group" aria-label="Neon Pong touch controls">
            <button
              className="pong-ctrl-btn game-touch-btn compact"
              onPointerDown={(e) => { e.preventDefault(); setPaddleKey('up', true); }}
              onPointerUp={() => setPaddleKey('up', false)}
              onPointerCancel={() => setPaddleKey('up', false)}
              onPointerLeave={() => setPaddleKey('up', false)}
            >
              UP
            </button>
            <button
              className="pong-ctrl-btn game-touch-btn compact"
              onPointerDown={(e) => { e.preventDefault(); setPaddleKey('down', true); }}
              onPointerUp={() => setPaddleKey('down', false)}
              onPointerCancel={() => setPaddleKey('down', false)}
              onPointerLeave={() => setPaddleKey('down', false)}
            >
              DOWN
            </button>
          </div>
        </>
      )}
    </div>
  );
}
