import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useScores } from '../../ScoreContext';
import { triggerHaptic } from '../../utils/haptics';
import './NeonTetris.css';

const COLS = 10;
const ROWS = 20;
const INITIAL_SPEED = 800;

const SHAPES = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: '#00f0f0' },
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], color: '#0000f0' },
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], color: '#f0a000' },
  O: { shape: [[1,1], [1,1]], color: '#f0f000' },
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], color: '#00f000' },
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], color: '#a000f0' },
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], color: '#f00000' }
};

const RANDOM_PIECE = () => {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return { type, ...SHAPES[type], x: 3, y: -2 };
};

export default function NeonTetris() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['neon-tetris'] || 0;
  const [selectedLevel, setSelectedLevel] = useState(1);

  const [grid, setGrid] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [activePiece, setActivePiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(() => RANDOM_PIECE());
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [particles, setParticles] = useState([]);
  const [landingPulses, setLandingPulses] = useState([]);

  const activePieceRef = useRef();
  activePieceRef.current = activePiece;
  const particleIdRef = useRef(0);

  const spawnPiece = useCallback(() => {
    const piece = nextPiece;
    const next = RANDOM_PIECE();
    setNextPiece(next);
    
    if (checkCollision(piece.x, piece.y, piece.shape)) {
      setGameOver(true);
      triggerHaptic('gameOver', { key: 'tetris-over', cooldown: 500 });
      if (score > highScore) updateHighScore('neon-tetris', score);
    } else {
      setActivePiece(piece);
    }
  }, [nextPiece, score, highScore, updateHighScore]);

  const spawnParticles = (row, color) => {
    const newParticles = [];
    for (let c = 0; c < COLS; c++) {
      for (let i = 0; i < 4; i++) {
        newParticles.push({
          id: particleIdRef.current++,
          x: (c / COLS) * 100 + (Math.random() * 5),
          y: (row / ROWS) * 100 + (Math.random() * 5),
          dx: (Math.random() - 0.5) * 100 + 'px',
          dy: (Math.random() - 0.5) * 100 + 'px',
          color
        });
      }
    }
    setParticles(prev => [...prev.slice(-50), ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  };

  const checkCollision = (x, y, shape, currentGrid = grid) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && currentGrid[newY][newX]) return true;
        }
      }
    }
    return false;
  };

  const rotatePiece = () => {
    if (!activePiece || isPaused || gameOver) return;
    const rotated = activePiece.shape[0].map((_, i) => activePiece.shape.map(row => row[i]).reverse());
    if (!checkCollision(activePiece.x, activePiece.y, rotated)) {
      setActivePiece({ ...activePiece, shape: rotated });
    }
  };

  const movePiece = (dx, dy) => {
    if (!activePiece || isPaused || gameOver) return false;
    if (!checkCollision(activePiece.x + dx, activePiece.y + dy, activePiece.shape)) {
      setActivePiece({ ...activePiece, x: activePiece.x + dx, y: activePiece.y + dy });
      return true;
    }
    if (dy > 0) lockPiece();
    return false;
  };

  const lockPiece = () => {
    const s = activePieceRef.current;
    if (!s) return;
    
    const newGrid = grid.map(row => [...row]);
    let landingCells = [];
    s.shape.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell && s.y + ri >= 0) {
          newGrid[s.y + ri][s.x + ci] = s.color;
          landingCells.push({ r: s.y + ri, c: s.x + ci });
        }
      });
    });

    // Create landing pulses
    setLandingPulses(prev => [...prev, ...landingCells]);
    setTimeout(() => {
      setLandingPulses(prev => prev.filter(lp => !landingCells.find(lc => lc.r === lp.r && lc.c === lp.c)));
    }, 300);

    // Clear lines
    let cleared = 0;
    const finalGrid = [];
    for (let r = 0; r < ROWS; r++) {
      const isFull = newGrid[r].every(cell => cell !== 0);
      if (isFull) {
        cleared++;
        spawnParticles(r, '#fff');
      } else {
        finalGrid.push(newGrid[r]);
      }
    }

    while (finalGrid.length < ROWS) {
      finalGrid.unshift(Array(COLS).fill(0));
    }

    if (cleared > 0) {
      triggerHaptic(cleared >= 3 ? 'success' : 'hit', { key: 'tetris-clear', cooldown: 120 });
      setScore(prev => prev + [0, 100, 300, 500, 1000][cleared] * level);
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      if (score > 0 && score % 1000 === 0) setLevel(l => l + 1);
    } else {
      triggerHaptic('soft', { key: 'tetris-lock', cooldown: 70 });
    }

    setGrid(finalGrid);
    setActivePiece(null);
  };

  const handleKeyDown = useCallback((e) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft') movePiece(-1, 0);
    if (e.key === 'ArrowRight') movePiece(1, 0);
    if (e.key === 'ArrowDown') movePiece(0, 1);
    if (e.key === 'ArrowUp') rotatePiece();
    if (e.key === ' ') {
      // Hard drop
      if (!activePieceRef.current) return;
      let tempY = activePieceRef.current.y;
      while (!checkCollision(activePieceRef.current.x, tempY + 1, activePieceRef.current.shape)) {
        tempY++;
      }
      setActivePiece({ ...activePieceRef.current, y: tempY });
      setTimeout(lockPiece, 50);
    }
    if (e.key === 'p' || e.key === 'P') setIsPaused(!isPaused);
  }, [grid, activePiece, gameOver, isPaused]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!activePiece && !gameOver) spawnPiece();
  }, [activePiece, gameOver, spawnPiece]);

  useEffect(() => {
    const speed = Math.max(100, INITIAL_SPEED - (level - 1) * 100);
    const interval = setInterval(() => {
      if (!isPaused && !gameOver) movePiece(0, 1);
    }, speed);
    return () => clearInterval(interval);
  }, [activePiece, isPaused, gameOver, level]);

  const resetGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setScore(0);
    setLevel(selectedLevel);
    setNextPiece(RANDOM_PIECE());
    setGameOver(false);
    setIsPaused(false);
    setParticles([]);
    setActivePiece(null);
  };

  const handleMobileAction = (action) => {
    if (gameOver) return;
    if (action === 'left') movePiece(-1, 0);
    if (action === 'right') movePiece(1, 0);
    if (action === 'down') movePiece(0, 1);
    if (action === 'rotate') rotatePiece();
    if (action === 'drop') {
      if (!activePieceRef.current) return;
      let tempY = activePieceRef.current.y;
      while (!checkCollision(activePieceRef.current.x, tempY + 1, activePieceRef.current.shape)) {
        tempY++;
      }
      setActivePiece({ ...activePieceRef.current, y: tempY });
      setTimeout(lockPiece, 50);
    }
    if (action === 'pause') setIsPaused(prev => !prev);
  };

  // Ghost piece calculation
  const getGhostY = () => {
    if (!activePiece) return 0;
    let ghostY = activePiece.y;
    while (!checkCollision(activePiece.x, ghostY + 1, activePiece.shape)) {
      ghostY++;
    }
    return ghostY;
  };

  return (
    <div className={`neon-tetris-container ${shaking ? 'screen-shake' : ''}`}>
      <div className="tetris-sidebar">
        <div className="stat-box">
          <label>START LEVEL</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              textAlign: 'center'
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>LEVEL {lvl}</option>
            ))}
          </select>
        </div>

        {/* Next Piece Display */}
        <div className="next-piece-box">
          <label>NEXT PIECE</label>
          <div className="next-piece-grid">
            {Array.from({ length: 4 }).map((_, r) => (
              Array.from({ length: 4 }).map((_, c) => {
                const isPart = nextPiece.shape[r] && nextPiece.shape[r][c];
                return (
                  <div 
                    key={`${r}-${c}`}
                    className="tetris-cell"
                    style={{ 
                      backgroundColor: isPart ? nextPiece.color : 'transparent',
                      boxShadow: isPart ? `0 0 10px ${nextPiece.color}` : 'none'
                    }}
                  />
                )
              })
            ))}
          </div>
        </div>

        <div className="stat-box">
          <label>SCORE</label>
          <div className="value">{score.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <label>LEVEL</label>
          <div className="value">{level}</div>
        </div>
        <div className="stat-box highlight">
          <label>BEST</label>
          <div className="value">{highScore.toLocaleString()}</div>
        </div>
        <button className="reset-btn" onClick={resetGame}>REBOOT SYSTEM</button>
      </div>

      <div className="tetris-board-wrapper">
        <div className="tetris-board">
          {grid.map((row, ri) => (
            <div key={ri} className="tetris-row">
              {row.map((cell, ci) => {
                let color = cell;
                let isGhost = false;
                let isActive = false;
                const isLanding = landingPulses.some(p => p.r === ri && p.c === ci);

                if (activePiece) {
                  const ghostY = getGhostY();
                  const pr = ri - activePiece.y;
                  const pc = ci - activePiece.x;
                  const gr = ri - ghostY;
                  
                  if (pr >= 0 && pr < activePiece.shape.length && pc >= 0 && pc < activePiece.shape[0].length && activePiece.shape[pr][pc]) {
                    color = activePiece.color;
                    isActive = true;
                  } else if (gr >= 0 && gr < activePiece.shape.length && pc >= 0 && pc < activePiece.shape[0].length && activePiece.shape[gr][pc]) {
                    color = activePiece.color;
                    isGhost = true;
                    isActive = false;
                  }
                }

                return (
                  <div 
                    key={ci} 
                    className={`tetris-cell ${isGhost ? 'ghost' : ''} ${isActive || cell ? 'filled' : ''} ${isActive ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: color !== 0 ? color : 'transparent', 
                      boxShadow: (color !== 0 && !isGhost) ? `0 0 15px ${color}` : 'none' 
                    }}
                  >
                    {isLanding && <div className="landing-pulse" />}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Particles */}
          {particles.map(p => (
            <div 
              key={p.id}
              className="tetris-particle"
              style={{ 
                left: `${p.x}%`, 
                top: `${p.y}%`, 
                backgroundColor: p.color,
                '--dx': p.dx,
                '--dy': p.dy
              }}
            />
          ))}
          
          {gameOver && (
            <div className="game-over-overlay">
              <h2>SYSTEM OVERLOAD</h2>
              <p>Score: {score.toLocaleString()}</p>
              <button onClick={resetGame}>REINITIALIZE CORE</button>
            </div>
          )}

          {isPaused && !gameOver && (
            <div className="game-over-overlay">
              <h2 style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>PAUSED</h2>
              <p>System state preserved.</p>
              <button onClick={() => setIsPaused(false)} style={{ background: 'var(--accent)', color: '#000' }}>RESUME</button>
            </div>
          )}
        </div>
      </div>

      <div className="tetris-mobile-controls game-touch-controls" role="group" aria-label="Neon Tetris touch controls">
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('left'); }}>LEFT</button>
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('right'); }}>RIGHT</button>
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('down'); }}>DOWN</button>
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('rotate'); }}>ROTATE</button>
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('drop'); }}>DROP</button>
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); handleMobileAction('pause'); }}>{isPaused ? 'RESUME' : 'PAUSE'}</button>
      </div>

      <div className="tetris-controls-hint">
        DESKTOP: ARROWS + SPACE + P | MOBILE: USE TOUCH PAD
      </div>
    </div>
  );
}
