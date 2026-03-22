import React, { useRef, useEffect, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './PacMan.css';

const MAP_SRC = [
  '1111111111111111111',
  '1222222221222222221',
  '1311211121211121131',
  '1222222222222222221',
  '1211212111112121121',
  '1222212221222122221',
  '11112111 1 11121111',
  '   121       121   ',
  '111121 11511 121111',
  '    2  10001  2    ',
  '111121 11111 121111',
  '   121       121   ',
  '111121 11111 121111',
  '1222222221222222221',
  '1211211121211121121',
  '1321222224222221231',
  '1121212111112121211',
  '1222212221222122221',
  '1111111111111111111'
];

const TILE_SIZE = 30;
const MAP_ROWS = MAP_SRC.length;
const MAP_COLS = MAP_SRC[0].length;
const CANVAS_W = MAP_COLS * TILE_SIZE;
const CANVAS_H = MAP_ROWS * TILE_SIZE;

const GHOST_COLORS = {
  blinky: '#f00',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb852'
};

const getInitialState = () => {
  const grid = [];
  let startX = 0, startY = 0;
  let totalPellets = 0;
  
  for (let r = 0; r < MAP_ROWS; r++) {
    const row = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const val = MAP_SRC[r][c];
      if (val === '4') {
        startX = c; startY = r;
        row.push(0);
      } else {
        if (val === '2' || val === '3') totalPellets++;
        row.push(val === ' ' ? 0 : parseInt(val) || 0);
      }
    }
    grid.push(row);
  }

  return {
    grid,
    totalPellets,
    player: { r: startY, c: startX, x: startX*TILE_SIZE, y: startY*TILE_SIZE, dir: null, nextDir: null, speed: 2.5, mouthOpen: 0, lastTileR: startY, lastTileC: startX },
    ghosts: [
      { name: 'blinky', r: 7, c: 9, x: 9*TILE_SIZE, y: 7*TILE_SIZE, dir: 'left', mode: 'scatter', speed: 2.2, lastTileR: -1, lastTileC: -1 },
      { name: 'pinky', r: 9, c: 9, x: 9*TILE_SIZE, y: 9*TILE_SIZE, dir: 'up', mode: 'wait', speed: 2.2, waitTimer: 0, lastTileR: -1, lastTileC: -1 },
      { name: 'inky', r: 9, c: 8, x: 8*TILE_SIZE, y: 9*TILE_SIZE, dir: 'up', mode: 'wait', speed: 2.2, waitTimer: 0, lastTileR: -1, lastTileC: -1 },
      { name: 'clyde', r: 9, c: 10, x: 10*TILE_SIZE, y: 9*TILE_SIZE, dir: 'up', mode: 'wait', speed: 2.2, waitTimer: 0, lastTileR: -1, lastTileC: -1 }
    ],
    score: 0,
    lives: 3,
    phase: 'scatter',
    phaseTimer: 0,
    frightTimer: 0,
    gameOver: false,
    gameWon: false,
    frameCounter: 0,
    gameStarted: false
  };
};

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

export default function PacMan() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['pacman'] || 0;
  
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ score: 0, lives: 3, over: false, won: false });
  
  const stateRef = useRef(getInitialState());

  const initGame = () => {
    stateRef.current = getInitialState();
    setUiState({ score: 0, lives: 3, over: false, won: false });
  };

  useEffect(() => {
    initGame();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    let animationId;

    const keyDown = (e) => {
      const s = stateRef.current;
      s.gameStarted = true;
      if (e.key === 'ArrowUp' || e.key === 'w') s.player.nextDir = 'up';
      if (e.key === 'ArrowDown' || e.key === 's') s.player.nextDir = 'down';
      if (e.key === 'ArrowLeft' || e.key === 'a') s.player.nextDir = 'left';
      if (e.key === 'ArrowRight' || e.key === 'd') s.player.nextDir = 'right';
    };
    window.addEventListener('keydown', keyDown);

    const isWalkable = (r, c, allowDoor = false) => {
      if (r < 0 || r >= MAP_ROWS) return false;
      // Tunnel wrap check
      if (c < 0 || c >= MAP_COLS) return true; 
      const val = stateRef.current.grid[r][c];
      return val !== 1 && (allowDoor ? true : val !== 5);
    };

    const distSq = (r1, c1, r2, c2) => (r1-r2)**2 + (c1-c2)**2;

    const updatePlay = () => {
      const s = stateRef.current;
      if (s.gameOver || s.gameWon || !s.gameStarted) return;

      s.frameCounter++;

      // Phrase timers (Scatter / Chase cycle)
      if (s.frightTimer > 0) {
        s.frightTimer--;
        if (s.frightTimer === 0) {
          s.ghosts.forEach(g => { if(g.mode === 'frightened') g.mode = s.phase; });
        }
      } else {
        s.phaseTimer++;
        if (s.phase === 'scatter' && s.phaseTimer > 60*7) {
          s.phase = 'chase'; s.phaseTimer = 0;
          s.ghosts.forEach(g => { if(g.mode!=='eaten' && g.mode!=='wait' && g.mode!=='exiting') { g.mode = 'chase'; g.dir = reverseDir(g.dir); }});
        }
        else if (s.phase === 'chase' && s.phaseTimer > 60*20) {
          s.phase = 'scatter'; s.phaseTimer = 0;
          s.ghosts.forEach(g => { if(g.mode!=='eaten' && g.mode!=='wait' && g.mode!=='exiting') { g.mode = 'scatter'; g.dir = reverseDir(g.dir); }});
        }
      }

      // Player Movement
      const p = s.player;
      p.mouthOpen = (p.mouthOpen + 0.15) % (Math.PI / 2);

      // Wrap tunnel
      if (p.x < -TILE_SIZE) { p.x = CANVAS_W; p.c = MAP_COLS-1; p.lastTileC = -1; }
      else if (p.x > CANVAS_W) { p.x = -TILE_SIZE; p.c = 0; p.lastTileC = -1; }

      // Check if we're at a tile center (and haven't already processed this tile)
      const snapX = p.c * TILE_SIZE;
      const snapY = p.r * TILE_SIZE;
      const atCenter = Math.abs(p.x - snapX) <= p.speed && Math.abs(p.y - snapY) <= p.speed;
      const newTile = p.r !== p.lastTileR || p.c !== p.lastTileC;

      if (atCenter && (newTile || !p.dir)) {
        p.x = snapX; p.y = snapY;
        p.lastTileR = p.r;
        p.lastTileC = p.c;

        // Try to turn in the queued direction
        if (p.nextDir) {
          const d = DIRS[p.nextDir];
          if (isWalkable(p.r + d.dy, p.c + d.dx)) {
            p.dir = p.nextDir;
            p.nextDir = null;
          }
        }
        
        // Check if ahead is blocked
        if (p.dir) {
          const d = DIRS[p.dir];
          if (!isWalkable(p.r + d.dy, p.c + d.dx)) {
            p.dir = null;
          }
        }
      }
      
      if (p.dir) {
        p.x += DIRS[p.dir].dx * p.speed;
        p.y += DIRS[p.dir].dy * p.speed;
        p.c = Math.round(p.x / TILE_SIZE);
        p.r = Math.round(p.y / TILE_SIZE);
      }

      // Eat Pellets
      if (p.r >= 0 && p.r < MAP_ROWS && p.c >= 0 && p.c < MAP_COLS) {
        const t = s.grid[p.r][p.c];
        if (t === 2) {
          s.score += 10; s.grid[p.r][p.c] = 0; s.totalPellets--;
        } else if (t === 3) {
          s.score += 50; s.grid[p.r][p.c] = 0; s.totalPellets--;
          s.frightTimer = 60 * 6; // 6 seconds
          s.ghosts.forEach(g => {
            if (g.mode !== 'eaten' && g.mode !== 'wait' && g.mode !== 'exiting') {
              g.mode = 'frightened';
              g.dir = reverseDir(g.dir);
              g.lastTileR = -1; g.lastTileC = -1;
            }
          });
        }
      }

      if (s.totalPellets === 0) {
        s.gameWon = true; s.gameOver = true;
      }

      // Release ghosts from the ghost house
      if (s.frameCounter === 60 && s.ghosts[1].mode === 'wait') {
        s.ghosts[1].mode = 'exiting';
      }
      if (s.frameCounter === 180 && s.ghosts[2].mode === 'wait') {
        s.ghosts[2].mode = 'exiting';
      }
      if (s.frameCounter === 300 && s.ghosts[3].mode === 'wait') {
        s.ghosts[3].mode = 'exiting';
      }

      // Ghost Movement
      s.ghosts.forEach(g => {
        // Tunnel wrap
        if (g.x < -TILE_SIZE) { g.x = CANVAS_W; g.c = MAP_COLS-1; g.lastTileC = -1; }
        else if (g.x > CANVAS_W) { g.x = -TILE_SIZE; g.c = 0; g.lastTileC = -1; }

        let curSpeed = g.mode === 'frightened' ? 1.2 : g.mode === 'eaten' ? 4 : g.speed;

        // Waiting ghosts bob inside the ghost house
        if (g.mode === 'wait') {
          g.waitTimer = (g.waitTimer || 0) + 1;
          g.y = g.r * TILE_SIZE + Math.sin(g.waitTimer * 0.08) * 4;
          return;
        }

        // Exiting ghost house — move up through the door to row 7, col 9
        if (g.mode === 'exiting') {
          // First move to center column (9)
          const exitCol = 9;
          const exitRow = 7;
          const exitX = exitCol * TILE_SIZE;
          const exitY = exitRow * TILE_SIZE;

          if (Math.abs(g.x - exitX) > 1) {
            g.x += (exitX > g.x ? 1 : -1) * curSpeed;
          } else if (Math.abs(g.y - exitY) > 1) {
            g.x = exitX;
            g.y -= curSpeed;
          } else {
            // Arrived outside
            g.x = exitX; g.y = exitY;
            g.r = exitRow; g.c = exitCol;
            g.mode = s.phase;
            g.dir = 'left';
            g.lastTileR = exitRow;
            g.lastTileC = exitCol;
          }
          return;
        }

        const gSnapX = g.c * TILE_SIZE;
        const gSnapY = g.r * TILE_SIZE;
        const gAtCenter = Math.abs(g.x - gSnapX) <= curSpeed && Math.abs(g.y - gSnapY) <= curSpeed;
        const gNewTile = g.r !== g.lastTileR || g.c !== g.lastTileC;

        if (gAtCenter && gNewTile) {
          g.x = gSnapX; g.y = gSnapY;
          g.lastTileR = g.r;
          g.lastTileC = g.c;

          let targetRow = 0, targetCol = 0;
          let allowDoor = g.mode === 'eaten';

          if (g.mode === 'eaten') {
            targetRow = 9; targetCol = 9;
            if (g.r === 9 && g.c === 9) {
              g.mode = s.phase;
              g.lastTileR = -1; g.lastTileC = -1;
              return;
            }
          } else if (g.mode === 'frightened') {
            targetRow = Math.floor(Math.random()*MAP_ROWS);
            targetCol = Math.floor(Math.random()*MAP_COLS);
          } else {
            // AI Targets
            if (g.name === 'blinky') {
              if (g.mode==='scatter') { targetRow = 0; targetCol = MAP_COLS-2; }
              else { targetRow = p.r; targetCol = p.c; }
            } else if (g.name === 'pinky') {
              if (g.mode==='scatter') { targetRow = 0; targetCol = 1; }
              else { 
                targetRow = p.r + (p.dir==='up'?-4:p.dir==='down'?4:0);
                targetCol = p.c + (p.dir==='left'?-4:p.dir==='right'?4:0);
              }
            } else if (g.name === 'inky') {
              if (g.mode==='scatter') { targetRow = MAP_ROWS-2; targetCol = MAP_COLS-2; }
              else {
                let pivotR = p.r + (p.dir==='up'?-2:p.dir==='down'?2:0);
                let pivotC = p.c + (p.dir==='left'?-2:p.dir==='right'?2:0);
                const b = s.ghosts[0];
                targetRow = pivotR + (pivotR - b.r);
                targetCol = pivotC + (pivotC - b.c);
              }
            } else if (g.name === 'clyde') {
              if (g.mode==='scatter' || Math.sqrt(distSq(g.r, g.c, p.r, p.c)) < 8) {
                targetRow = MAP_ROWS-2; targetCol = 1;
              } else {
                targetRow = p.r; targetCol = p.c;
              }
            }
          }

          // Choose next move at intersection
          let shortest = Infinity;
          let bestDir = null;
          const oppDir = reverseDir(g.dir);

          ['up', 'left', 'down', 'right'].forEach(dir => {
            if (dir === oppDir && g.mode !== 'frightened') return;
            const d = DIRS[dir];
            const nr = g.r + d.dy;
            const nc = g.c + d.dx;
            if (isWalkable(nr, nc, allowDoor)) {
              if (g.mode === 'frightened') {
                if (Math.random() < 0.5 || !bestDir) bestDir = dir;
              } else {
                const dist = distSq(nr, nc, targetRow, targetCol);
                if (dist < shortest) {
                  shortest = dist;
                  bestDir = dir;
                }
              }
            }
          });

          g.dir = bestDir || g.dir;
        }

        if (g.dir) {
          g.x += DIRS[g.dir].dx * curSpeed;
          g.y += DIRS[g.dir].dy * curSpeed;
          g.c = Math.round(g.x / TILE_SIZE);
          g.r = Math.round(g.y / TILE_SIZE);
        }

        // Collision with player
        if (g.mode !== 'exiting' && Math.abs(g.x - p.x) < TILE_SIZE*0.8 && Math.abs(g.y - p.y) < TILE_SIZE*0.8) {
          if (g.mode === 'frightened') {
            s.score += 200;
            g.mode = 'eaten';
          } else if (g.mode !== 'eaten') {
            s.lives--;
            if (s.lives <= 0) s.gameOver = true;
            else resetEntities();
          }
        }
      });

      if (s.score > highScore) {
        updateHighScore('pacman', s.score);
      }

      setUiState({ score: s.score, lives: s.lives, over: s.gameOver, won: s.gameWon });
    };

    const resetEntities = () => {
      const s = stateRef.current;
      const initial = getInitialState();
      s.player = initial.player;
      s.ghosts = initial.ghosts;
      s.phase = 'scatter';
      s.phaseTimer = 0;
      s.frightTimer = 0;
      s.frameCounter = 0;
      s.gameStarted = false;
    };

    const reverseDir = (d) => {
      if(d==='up')return 'down';if(d==='down')return 'up';
      if(d==='left')return 'right';if(d==='right')return 'left';
      return d;
    };

    const draw = () => {
      const s = stateRef.current;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw Map
      const half = TILE_SIZE / 2;
      for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
          const val = s.grid[r][c];
          const tx = c * TILE_SIZE;
          const ty = r * TILE_SIZE;
          
          if (val === 1) {
            ctx.fillStyle = '#1919A6';
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            // Internal black square for modern wall look
            ctx.fillStyle = '#000';
            ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          } else if (val === 2) {
            ctx.fillStyle = '#ffb8ae';
            ctx.beginPath();
            ctx.arc(tx + half, ty + half, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (val === 3) {
            ctx.fillStyle = '#ffb8ae';
            ctx.beginPath();
            const radius = s.frameCounter % 30 < 15 ? 7 : 5; // blink
            ctx.arc(tx + half, ty + half, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (val === 5) {
            ctx.fillStyle = '#ffa500';
            ctx.fillRect(tx, ty + half - 2, TILE_SIZE, 4);
          }
        }
      }

      // Draw Player
      const p = s.player;
      ctx.save();
      ctx.translate(p.x + half, p.y + half);
      if (p.dir === 'down') ctx.rotate(Math.PI / 2);
      else if (p.dir === 'up') ctx.rotate(-Math.PI / 2);
      else if (p.dir === 'left') ctx.rotate(Math.PI);

      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      let mouth = p.dir ? p.mouthOpen : 0.2;
      ctx.arc(0, 0, half - 2, mouth, Math.PI * 2 - mouth);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();

      // Draw Ghosts
      s.ghosts.forEach(g => {
        ctx.save();
        ctx.translate(g.x, g.y);
        
        let color = GHOST_COLORS[g.name];
        if (g.mode === 'frightened') color = (s.frightTimer < 120 && s.frameCounter % 20 < 10) ? '#fff' : '#00f';

        if (g.mode !== 'eaten') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(half, half, half - 2, Math.PI, 0);
          ctx.lineTo(TILE_SIZE - 2, TILE_SIZE - 2);
          
          // Wavy bottom
          ctx.lineTo(TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.lineTo(half, TILE_SIZE - 2);
          ctx.lineTo(6, TILE_SIZE - 6);
          
          ctx.lineTo(2, TILE_SIZE - 2);
          ctx.fill();
        }

        // Eyes
        ctx.fillStyle = g.mode === 'frightened' ? '#ffb8ae' : '#fff';
        ctx.beginPath(); ctx.arc(10, 10 + (g.dir==='down'?2:g.dir==='up'?-2:0), 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 10 + (g.dir==='down'?2:g.dir==='up'?-2:0), 3, 0, Math.PI*2); ctx.fill();
        
        if (g.mode !== 'frightened') {
          ctx.fillStyle = '#00f'; // pupil
          let ex = g.dir==='right'?2:g.dir==='left'?-2:0;
          ctx.beginPath(); ctx.arc(10+ex, 10 + (g.dir==='down'?3:g.dir==='up'?-1:1), 1.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(20+ex, 10 + (g.dir==='down'?3:g.dir==='up'?-1:1), 1.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      });

      if (!s.gameStarted && !s.gameOver && !s.gameWon) {
        ctx.fillStyle = '#ff0';
        ctx.font = '20px Courier New';
        ctx.fillText("READY!", CANVAS_W/2 - 35, CANVAS_H/2 + 65);
      }
    };

    const loop = () => {
      updatePlay();
      draw();
      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('keydown', keyDown);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const triggerDir = (dir) => {
    stateRef.current.gameStarted = true;
    stateRef.current.player.nextDir = dir;
  };

  return (
    <div className="pacman-container">
      <div className="pacman-header">
        <div className="header-stat"><span>SCORE</span><span>{uiState.score}</span></div>
        <div className="header-stat"><span>HI-SCORE</span><span>{highScore}</span></div>
        <div className="header-stat"><span>LIVES</span><span className="pacpac">{Array.from({length: uiState.lives}, (_, i) => <span key={i} style={{display:'inline-block',width:'18px',height:'18px',borderRadius:'50%',background:'#ff0',clipPath:'polygon(100% 50%, 50% 50%, 65% 15%, 100% 0%, 100% 100%, 65% 85%)',marginRight:'4px'}}></span>)}</span></div>
      </div>
      
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="pacman-canvas" />
        
        {uiState.over && (
          <div className="game-over-screen">
            <h2 className={uiState.won ? 'victory-text' : 'red-text'}>
              {uiState.won ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            <p>Score: {uiState.score}</p>
            <button className="restart-btn" onClick={initGame}>RESTART</button>
          </div>
        )}
      </div>

      <div className="controls-hint">
        <div className="controls-hint-text">Use Arrow Keys or W A S D to move</div>
        
        <div className="mobile-controls">
          <button className="mc-btn" onTouchStart={() => triggerDir('up')}>⬆️</button>
          <div className="mobile-row">
            <button className="mc-btn" onTouchStart={() => triggerDir('left')}>⬅️</button>
            <button className="mc-btn" onTouchStart={() => triggerDir('down')}>⬇️</button>
            <button className="mc-btn" onTouchStart={() => triggerDir('right')}>➡️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
