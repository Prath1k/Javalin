import React, { useState, useEffect, useCallback } from 'react';
import { useScores } from '../../ScoreContext';
import './NeonFusion.css';

const GRID_SIZE = 4;

const getEmptyGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

const addRandomTile = (grid) => {
  const emptyCells = [];
  grid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell === 0) emptyCells.push({ r: ri, c: ci });
    });
  });
  if (emptyCells.length === 0) return grid;
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
};

export default function NeonFusion() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['neon-fusion'] || 0;

  const [grid, setGrid] = useState(() => addRandomTile(addRandomTile(getEmptyGrid())));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const move = useCallback((direction) => {
    if (gameOver || won) return;

    let newGrid = grid.map(row => [...row]);
    let moved = false;
    let turnScore = 0;

    const rotate = (g) => g[0].map((_, i) => g.map(row => row[i]).reverse());

    // Normalize to "left" move
    if (direction === 'up') newGrid = rotate(rotate(rotate(newGrid)));
    if (direction === 'right') newGrid = rotate(rotate(newGrid));
    if (direction === 'down') newGrid = rotate(newGrid);

    // Process rows
    for (let r = 0; r < GRID_SIZE; r++) {
      let row = newGrid[r].filter(c => c !== 0);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
          row[i] *= 2;
          turnScore += row[i];
          row.splice(i + 1, 1);
          moved = true;
          if (row[i] === 2048) setWon(true);
        }
      }
      while (row.length < GRID_SIZE) row.push(0);
      if (JSON.stringify(newGrid[r]) !== JSON.stringify(row)) moved = true;
      newGrid[r] = row;
    }

    // Revert rotation
    if (direction === 'up') newGrid = rotate(newGrid);
    if (direction === 'right') newGrid = rotate(rotate(newGrid));
    if (direction === 'down') newGrid = rotate(rotate(rotate(newGrid)));

    if (moved) {
      const gWithNewTile = addRandomTile(newGrid);
      setGrid(gWithNewTile);
      setScore(s => s + turnScore);
      
      // Check game over
      if (isGameOver(gWithNewTile)) setGameOver(true);
    }
  }, [grid, gameOver, won]);

  const isGameOver = (g) => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (g[r][c] === 0) return false;
        if (r < GRID_SIZE - 1 && g[r][c] === g[r + 1][c]) return false;
        if (c < GRID_SIZE - 1 && g[r][c] === g[r][c + 1]) return false;
      }
    }
    return true;
  };

  const handleKeyDown = useCallback((e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) move('up');
    if (['ArrowDown', 's', 'S'].includes(e.key)) move('down');
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) move('left');
    if (['ArrowRight', 'd', 'D'].includes(e.key)) move('right');
  }, [move]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (score > highScore) updateHighScore('neon-fusion', score);
  }, [score, highScore, updateHighScore]);

  const resetGame = () => {
    setGrid(addRandomTile(addRandomTile(getEmptyGrid())));
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  const handleTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !e.changedTouches?.[0]) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.x;
    const dy = endY - touchStart.y;
    const threshold = 24;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      move(dx > 0 ? 'right' : 'left');
    } else if (Math.abs(dy) > threshold) {
      move(dy > 0 ? 'down' : 'up');
    }

    setTouchStart(null);
  };

  const colors = {
    2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563',
    32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61',
    512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'
  };

  return (
    <div className="neon-fusion-container">
      <div className="fusion-header">
        <div className="fusion-title">NEON<span>FUSION</span></div>
        <div className="fusion-stats">
          <div className="stat-card">
            <span className="label">SCORE</span>
            <span className="value">{score}</span>
          </div>
          <div className="stat-card best">
            <span className="label">BEST</span>
            <span className="value">{highScore}</span>
          </div>
        </div>
      </div>

      <div className="fusion-grid" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {grid.map((row, ri) => (
          <div key={ri} className="fusion-row">
            {row.map((cell, ci) => (
              <div key={ci} className={`fusion-cell ${cell > 0 ? 'filled' : ''}`} style={{
                backgroundColor: cell > 0 ? colors[cell] || '#3c3a32' : 'rgba(255,255,255,0.05)',
                color: cell > 4 ? '#f9f6f2' : '#776e65',
                fontSize: cell >= 1024 ? '1.5rem' : '2.5rem'
              }}>
                {cell > 0 ? cell : ''}
              </div>
            ))}
          </div>
        ))}

        {(gameOver || won) && (
          <div className="fusion-overlay">
            <h2>{won ? 'FUSION COMPLETE' : 'SINGULARITY BREACHED'}</h2>
            <button className="reset-btn" onClick={resetGame}>REINITIALIZE</button>
          </div>
        )}
      </div>

      <div className="fusion-mobile-controls game-touch-controls" role="group" aria-label="Neon Fusion touch controls">
        <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); move('up'); }}>UP</button>
        <div className="fusion-mobile-row game-touch-row">
          <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); move('left'); }}>LEFT</button>
          <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); move('down'); }}>DOWN</button>
          <button className="game-touch-btn compact" onPointerDown={(e) => { e.preventDefault(); move('right'); }}>RIGHT</button>
        </div>
      </div>

      <div className="fusion-controls-hint game-controls-hint">
        Desktop: Arrows/WASD. Mobile: swipe the board or use touch controls.
      </div>
    </div>
  );
}
