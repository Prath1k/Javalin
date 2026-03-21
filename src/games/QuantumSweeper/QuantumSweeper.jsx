import React, { useState, useEffect, useCallback, useRef } from 'react';
import './QuantumSweeper.css';

const ROWS = 10;
const COLS = 10;
const MINES = 15;

const QuantumSweeper = () => {
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [mineCount, setMineCount] = useState(MINES);
  const [firstClick, setFirstClick] = useState(true);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastRevealCount, setLastRevealCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef(null);

  const initializeGrid = useCallback(() => {
    let newGrid = [];
    for (let r = 0; r < ROWS; r++) {
      let row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          r, c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
          revealDelay: 0
        });
      }
      newGrid.push(row);
    }
    return newGrid;
  }, []);

  const placeMines = (initialGrid, firstR, firstC) => {
    let newGrid = initialGrid.map(row => row.map(cell => ({ ...cell })));
    let minesPlaced = 0;

    while (minesPlaced < MINES) {
      let r = Math.floor(Math.random() * ROWS);
      let c = Math.floor(Math.random() * COLS);
      if (!newGrid[r][c].isMine && !(r === firstR && c === firstC)) {
        newGrid[r][c].isMine = true;
        minesPlaced++;
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (r+i >= 0 && r+i < ROWS && c+j >= 0 && c+j < COLS) {
                if (newGrid[r+i][c+j].isMine) count++;
              }
            }
          }
          newGrid[r][c].neighborMines = count;
        }
      }
    }
    return newGrid;
  };

  useEffect(() => {
    setGrid(initializeGrid());
  }, [initializeGrid]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  const revealCell = (r, c) => {
    if (gameOver || gameWon || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

    let newGrid = grid.map(row => row.map(cell => ({ ...cell })));

    if (firstClick) {
      newGrid = placeMines(newGrid, r, c);
      setFirstClick(false);
      setIsTimerRunning(true);
    }

    if (newGrid[r][c].isMine) {
      newGrid[r][c].isRevealed = true;
      revealAllMines(newGrid);
      setGrid(newGrid);
      setGameOver(true);
      setIsTimerRunning(false);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    // Flood fill with cascade delay
    let revealCount = 0;
    const floodFill = (gridRef, r, c, delay) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || gridRef[r][c].isRevealed || gridRef[r][c].isFlagged) return;
      gridRef[r][c].isRevealed = true;
      gridRef[r][c].revealDelay = delay;
      revealCount++;
      if (gridRef[r][c].neighborMines === 0) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            floodFill(gridRef, r + i, c + j, delay + 1);
          }
        }
      }
    };

    floodFill(newGrid, r, c, 0);
    setLastRevealCount(revealCount);
    setTimeout(() => setLastRevealCount(0), 1200);
    setGrid(newGrid);
    checkWinCondition(newGrid);
  };

  const toggleFlag = (e, r, c) => {
    e.preventDefault();
    if (gameOver || gameWon || grid[r][c].isRevealed) return;
    let newGrid = grid.map(row => row.map(cell => ({ ...cell })));
    const newFlagState = !newGrid[r][c].isFlagged;
    newGrid[r][c].isFlagged = newFlagState;
    setMineCount(prev => newFlagState ? prev - 1 : prev + 1);
    setGrid(newGrid);
    checkWinCondition(newGrid);
  };

  const revealAllMines = (gridRef) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (gridRef[r][c].isMine) gridRef[r][c].isRevealed = true;
      }
    }
  };

  const checkWinCondition = (currentGrid) => {
    let unrevealedSafeCells = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!currentGrid[r][c].isRevealed && !currentGrid[r][c].isMine) unrevealedSafeCells++;
      }
    }
    if (unrevealedSafeCells === 0) {
      setGameWon(true);
      setIsTimerRunning(false);
      let newGrid = currentGrid.map(row => row.map(cell => ({ ...cell })));
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (newGrid[r][c].isMine) newGrid[r][c].isFlagged = true;
        }
      }
      setGrid(newGrid);
      setMineCount(0);
    }
  };

  const resetGame = () => {
    setGrid(initializeGrid());
    setGameOver(false);
    setGameWon(false);
    setMineCount(MINES);
    setFirstClick(true);
    setTimer(0);
    setIsTimerRunning(false);
    setLastRevealCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const getNumberColor = (num) => {
    const colors = ['#ffffff', '#2dd4bf', '#a78bfa', '#f472b6', '#fb923c', '#ef4444', '#14b8a6', '#8b5cf6', '#000000'];
    return colors[num] || '#ffffff';
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`sweeper-container ${shaking ? 'screen-shake' : ''}`}>
      <div className="sweeper-header">
        <div className="sweeper-stat">
          <span className="stat-label">MINES</span>
          <span className="stat-value text-teal">{mineCount}</span>
        </div>

        <div className="sweeper-stat">
          <span className="stat-label">TIME</span>
          <span className="stat-value text-slate">{formatTime(timer)}</span>
        </div>

        <button className="reset-btn" onClick={resetGame}>
          {gameOver ? '😵' : (gameWon ? '😎' : '🙂')}
        </button>

        <div className="sweeper-stat" style={{ textAlign: 'right' }}>
          <span className="stat-label">STATUS</span>
          <span className={`stat-value ${gameOver ? 'text-rose' : (gameWon ? 'text-teal' : 'text-slate')}`}>
            {gameOver ? 'BREACHED' : (gameWon ? 'SECURE' : 'ACTIVE')}
          </span>
        </div>
      </div>

      {/* Chain reveal counter */}
      {lastRevealCount > 3 && (
        <div className="chain-counter">
          <span>⚡ CHAIN REVEAL x{lastRevealCount}</span>
        </div>
      )}

      <div className="sweeper-grid">
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="grid-row">
            {row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`grid-cell ${cell.isRevealed ? 'revealed' : 'hidden'} ${cell.isMine && cell.isRevealed && !gameWon ? 'mine-explosion' : ''}`}
                style={cell.isRevealed && cell.revealDelay > 0 ? {
                  animationDelay: `${cell.revealDelay * 30}ms`
                } : undefined}
                onClick={() => revealCell(rIdx, cIdx)}
                onContextMenu={(e) => toggleFlag(e, rIdx, cIdx)}
              >
                {cell.isRevealed ? (
                  cell.isMine ? (
                    <span className="mine-icon">💥</span>
                  ) : (
                    cell.neighborMines > 0 && <span style={{ color: getNumberColor(cell.neighborMines) }}>{cell.neighborMines}</span>
                  )
                ) : (
                  cell.isFlagged && <span className="flag-icon">🚩</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {(gameOver || gameWon) && (
        <div className="sweeper-overlay">
          <h2>{gameWon ? 'QUANTUM FIELD SECURED' : 'CONTAINMENT FAILED'}</h2>
          <p className="overlay-time">Time: {formatTime(timer)}</p>
          <button className="play-again-btn" onClick={resetGame}>RUN_DIAGNOSTIC</button>
        </div>
      )}
    </div>
  );
};

export default QuantumSweeper;
