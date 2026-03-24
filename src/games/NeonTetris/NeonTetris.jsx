import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useScores } from '../../ScoreContext';
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

  const [grid, setGrid] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [activePiece, setActivePiece] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [shaking, setShaking] = useState(false);

  const gameLoopRef = useRef();
  const activePieceRef = useRef();
  activePieceRef.current = activePiece;

  const spawnPiece = useCallback(() => {
    const piece = RANDOM_PIECE();
    if (checkCollision(piece.x, piece.y, piece.shape)) {
      setGameOver(true);
      if (score > highScore) updateHighScore('neon-tetris', score);
    } else {
      setActivePiece(piece);
    }
  }, [score, highScore, updateHighScore]);

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
    s.shape.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell && s.y + ri >= 0) {
          newGrid[s.y + ri][s.x + ci] = s.color;
        }
      });
    });

    // Clear lines
    let cleared = 0;
    const filteredGrid = newGrid.filter(row => {
      const isFull = row.every(cell => cell !== 0);
      if (isFull) cleared++;
      return !isFull;
    });

    while (filteredGrid.length < ROWS) {
      filteredGrid.unshift(Array(COLS).fill(0));
    }

    if (cleared > 0) {
      setScore(prev => prev + [0, 100, 300, 500, 800][cleared] * level);
      setShaking(true);
      setTimeout(() => setShaking(false), 200);
    }

    setGrid(filteredGrid);
    spawnPiece();
  };

  const handleKeyDown = useCallback((e) => {
    if (gameOver) return;
    if (e.key === 'ArrowLeft') movePiece(-1, 0);
    if (e.key === 'ArrowRight') movePiece(1, 0);
    if (e.key === 'ArrowDown') movePiece(0, 1);
    if (e.key === 'ArrowUp') rotatePiece();
    if (e.key === ' ') {
      // Hard drop
      let tempY = activePieceRef.current.y;
      while (!checkCollision(activePieceRef.current.x, tempY + 1, activePieceRef.current.shape)) {
        tempY++;
      }
      setActivePiece({ ...activePieceRef.current, y: tempY });
      // We need to wait a tick or manually lock it
      setTimeout(lockPiece, 0);
    }
    if (e.key === 'p') setIsPaused(!isPaused);
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
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
    spawnPiece();
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
          <label>SCORE</label>
          <div className="value">{score}</div>
        </div>
        <div className="stat-box">
          <label>LEVEL</label>
          <div className="value">{level}</div>
        </div>
        <div className="stat-box highlight">
          <label>BEST</label>
          <div className="value">{highScore}</div>
        </div>
        <button className="reset-btn" onClick={resetGame}>REBOOT</button>
      </div>

      <div className="tetris-board">
        {grid.map((row, ri) => (
          <div key={ri} className="tetris-row">
            {row.map((cell, ci) => {
              let color = cell;
              let isGhost = false;
              let isActive = false;

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
                }
              }

              return (
                <div 
                  key={ci} 
                  className={`tetris-cell ${isGhost ? 'ghost' : ''} ${isActive ? 'active' : ''}`}
                  style={{ backgroundColor: color !== 0 ? color : 'transparent', boxShadow: color !== 0 && !isGhost ? `0 0 10px ${color}` : 'none' }}
                />
              );
            })}
          </div>
        ))}
        
        {gameOver && (
          <div className="game-over-overlay">
            <h2>SYSTEM OVERLOAD</h2>
            <p>Score: {score}</p>
            <button onClick={resetGame}>REINITIALIZE</button>
          </div>
        )}
      </div>

      <div className="tetris-controls-hint game-controls-hint">
        Arrows: Move/Rotate | Space: Hard Drop | P: Pause
      </div>
    </div>
  );
}
