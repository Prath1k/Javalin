import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './SpaceInvaders.css';

export default function SpaceInvaders() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['space-invaders'] || 0;
  
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Game state refs to avoid re-renders during the game loop
  const gameState = useRef({
    player: { x: 375, y: 550, width: 50, height: 20, speed: 5, dx: 0 },
    bullets: [],
    alienBullets: [],
    aliens: [],
    particles: [],
    score: 0,
    alienDirection: 1,
    alienDrop: 0,
    alienSpeed: 1,
    lastAlienFire: 0,
    isGameOver: false,
    isWon: false,
    keys: { ArrowLeft: false, ArrowRight: false, Space: false }
  });

  const initGame = () => {
    const aliens = [];
    const rows = 5;
    const cols = 10;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({
          x: c * 50 + 100,
          y: r * 40 + 50,
          width: 30,
          height: 30,
          alive: true,
          type: r === 0 ? 'top' : r < 3 ? 'mid' : 'bottom'
        });
      }
    }
    
    gameState.current = {
      player: { x: 375, y: 550, width: 50, height: 20, speed: 5, dx: 0 },
      bullets: [],
      alienBullets: [],
      aliens,
      particles: [],
      score: 0,
      alienDirection: 1,
      alienDrop: 0,
      alienSpeed: 1,
      lastAlienFire: Date.now(),
      isGameOver: false,
      isWon: false,
      keys: { ArrowLeft: false, ArrowRight: false, Space: false }
    };
    
    setScore(0);
    setGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    initGame();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.ArrowLeft = true;
      if (e.key === 'ArrowRight') gameState.current.keys.ArrowRight = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        gameState.current.keys.Space = true;
        // Fire bullet
        if (gameState.current.bullets.length < 3 && !gameState.current.isGameOver) {
          gameState.current.bullets.push({
            x: gameState.current.player.x + gameState.current.player.width / 2 - 2,
            y: gameState.current.player.y,
            width: 4,
            height: 10,
            speed: 7
          });
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.ArrowLeft = false;
      if (e.key === 'ArrowRight') gameState.current.keys.ArrowRight = false;
      if (e.key === ' ' || e.key === 'Spacebar') gameState.current.keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      const state = gameState.current;
      if (state.isGameOver || state.isWon) return;

      // Player Movement
      if (state.keys.ArrowLeft) state.player.x -= state.player.speed;
      if (state.keys.ArrowRight) state.player.x += state.player.speed;
      
      // Bounds
      if (state.player.x < 0) state.player.x = 0;
      if (state.player.x + state.player.width > 800) state.player.x = 800 - state.player.width;

      // Bullets Movement
      state.bullets.forEach((b, index) => {
        b.y -= b.speed;
        if (b.y < 0) state.bullets.splice(index, 1);
      });

      // Alien Bullets
      state.alienBullets.forEach((b, index) => {
        b.y += b.speed;
        if (b.y > 600) state.alienBullets.splice(index, 1);
      });

      // Aliens Movement
      let hitEdge = false;
      let livingAliens = 0;
      
      state.aliens.forEach(alien => {
        if (!alien.alive) return;
        livingAliens++;
        alien.x += state.alienSpeed * state.alienDirection;
        
        if (alien.x <= 0 || alien.x + alien.width >= 800) {
          hitEdge = true;
        }
      });

      if (livingAliens === 0) {
        state.isWon = true;
        setGameWon(true);
        setGameOver(true);
        updateHighScore('space-invaders', state.score);
      }

      if (hitEdge) {
        state.alienDirection *= -1;
        state.aliens.forEach(alien => {
          if (alien.alive) {
            alien.y += 20;
            // Alien reached player level
            if (alien.y + alien.height >= state.player.y) {
              state.isGameOver = true;
              setGameOver(true);
              updateHighScore('space-invaders', state.score);
            }
          }
        });
        state.alienSpeed += 0.2; // Speed up
      }

      // Alien Firing
      if (Date.now() - state.lastAlienFire > 1000 - (state.alienSpeed * 100) && livingAliens > 0) {
        const activeAliens = state.aliens.filter(a => a.alive);
        const randomAlien = activeAliens[Math.floor(Math.random() * activeAliens.length)];
        state.alienBullets.push({
          x: randomAlien.x + randomAlien.width / 2 - 2,
          y: randomAlien.y + randomAlien.height,
          width: 4,
          height: 10,
          speed: 4
        });
        state.lastAlienFire = Date.now();
      }

      // Collisions: Player bullets -> Aliens
      state.bullets.forEach((bullet, bIndex) => {
        state.aliens.forEach((alien) => {
          if (alien.alive && 
              bullet.x < alien.x + alien.width &&
              bullet.x + bullet.width > alien.x &&
              bullet.y < alien.y + alien.height &&
              bullet.y + bullet.height > alien.y) {
            
            alien.alive = false;
            state.bullets.splice(bIndex, 1);
            
            // Add particles
            for(let i=0; i<5; i++) {
              state.particles.push({
                x: alien.x + alien.width/2,
                y: alien.y + alien.height/2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1
              });
            }
            
            state.score += alien.type === 'top' ? 30 : alien.type === 'mid' ? 20 : 10;
            setScore(state.score);
          }
        });
      });

      // Collisions: Alien bullets -> Player
      state.alienBullets.forEach((bullet) => {
        if (bullet.x < state.player.x + state.player.width &&
            bullet.x + bullet.width > state.player.x &&
            bullet.y < state.player.y + state.player.height &&
            bullet.y + bullet.height > state.player.y) {
          state.isGameOver = true;
          setGameOver(true);
          updateHighScore('space-invaders', state.score);
        }
      });
      
      // Update particles
      state.particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if(p.life <= 0) state.particles.splice(i, 1);
      });
    };

    const draw = () => {
      const state = gameState.current;
      
      // Clear canvas
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 800, 600);

      // Draw Player
      ctx.fillStyle = '#0f0';
      ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
      // Ship cannon
      ctx.fillRect(state.player.x + 20, state.player.y - 10, 10, 10);

      // Draw Aliens
      state.aliens.forEach(alien => {
        if (!alien.alive) return;
        ctx.fillStyle = alien.type === 'top' ? '#f0f' : alien.type === 'mid' ? '#0ff' : '#0f0';
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
      });

      // Draw Bullets
      ctx.fillStyle = '#fff';
      state.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
      
      ctx.fillStyle = '#f00';
      state.alienBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
      
      // Draw Particles
      state.particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      });
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="space-invaders-container">
      <div className="space-invaders-header">
        <div>SCORE: {score}</div>
        <div>SPACE INVADERS</div>
      </div>
      
      <div style={{ position: 'relative' }}>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600} 
          className="space-invaders-canvas"
        />
        
        {gameOver && (
          <div className={`game-over-screen ${gameWon ? 'victory' : ''}`}>
            <h2>{gameWon ? 'VICTORY' : 'GAME OVER'}</h2>
            <p>Final Score: {score}</p>
            <button className="restart-btn" onClick={initGame}>
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
      
      <div className="controls-hint">
        ← / → to Move | SPACE to shoot
      </div>
    </div>
  );
}
