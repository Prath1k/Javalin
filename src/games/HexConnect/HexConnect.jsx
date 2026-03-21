import React, { useState, useEffect, useRef } from 'react';
import './HexConnect.css';

const GRID_SIZE = 6;

const LEVELS = [
  {
    id: 1,
    name: 'BASIC',
    grid: [
      ['red', 0, 0, 0, 0, 'blue'],
      [0, 0, 'green', 0, 0, 0],
      [0, 0, 0, 0, 'red', 0],
      ['yellow', 0, 0, 0, 0, 0],
      [0, 0, 'yellow', 'green', 0, 'blue'],
      [0, 0, 0, 0, 0, 0]
    ]
  },
  {
    id: 2,
    name: 'INTERMEDIATE',
    grid: [
      ['red', 0, 'blue', 0, 0, 'green'],
      [0, 0, 0, 0, 0, 0],
      [0, 'yellow', 0, 0, 'red', 0],
      [0, 0, 0, 0, 0, 0],
      ['green', 0, 0, 'yellow', 0, 0],
      [0, 0, 'blue', 0, 0, 0]
    ]
  },
  {
    id: 3,
    name: 'ADVANCED',
    grid: [
      [0, 'red', 0, 0, 'blue', 0],
      ['green', 0, 0, 0, 0, 'yellow'],
      [0, 0, 'blue', 0, 0, 0],
      [0, 0, 0, 'green', 0, 0],
      ['yellow', 0, 0, 0, 0, 'red'],
      [0, 0, 0, 0, 0, 0]
    ]
  }
];

const COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308'
};

const HexConnect = () => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [paths, setPaths] = useState({ red: [], blue: [], green: [], yellow: [] });
  const [activeColor, setActiveColor] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const gridRef = useRef(null);

  const LEVEL = LEVELS[currentLevel].grid;

  const handlePointerDown = (r, c, cellColor) => {
    if (isCompleted) return;
    if (cellColor) {
      setActiveColor(cellColor);
      setPaths(prev => ({ ...prev, [cellColor]: [{ r, c }] }));
      setMoveCount(m => m + 1);
    } else {
      const foundColor = Object.keys(paths).find(color =>
        paths[color].some(p => p.r === r && p.c === c)
      );
      if (foundColor) {
        setActiveColor(foundColor);
        const pathIndex = paths[foundColor].findIndex(p => p.r === r && p.c === c);
        setPaths(prev => ({
          ...prev,
          [foundColor]: prev[foundColor].slice(0, pathIndex + 1)
        }));
      }
    }
  };

  const handlePointerEnter = (r, c) => {
    if (!activeColor || isCompleted) return;
    const currentPath = paths[activeColor];
    if (currentPath.length === 0) return;
    const lastNode = currentPath[currentPath.length - 1];
    const isAdjacent = Math.abs(lastNode.r - r) + Math.abs(lastNode.c - c) === 1;
    if (!isAdjacent) return;

    if (currentPath.length > 1) {
      const prevNode = currentPath[currentPath.length - 2];
      if (prevNode.r === r && prevNode.c === c) {
        setPaths(prev => ({
          ...prev,
          [activeColor]: currentPath.slice(0, -1)
        }));
        return;
      }
    }

    const cellObjectColor = LEVEL[r][c];
    if (cellObjectColor && cellObjectColor !== activeColor) return;
    if (currentPath.length > 0 && currentPath[0].r === r && currentPath[0].c === c) return;

    let collision = false;
    Object.keys(paths).forEach(color => {
      if (color !== activeColor) {
        if (paths[color].some(p => p.r === r && p.c === c)) collision = true;
      }
    });
    if (collision) return;

    const newPath = [...currentPath, { r, c }];
    setPaths(prev => ({ ...prev, [activeColor]: newPath }));

    if (cellObjectColor === activeColor) setActiveColor(null);
  };

  const handlePointerUp = () => {
    setActiveColor(null);
    checkWinCondition();
  };

  const checkWinCondition = () => {
    let allConnected = true;
    let totalPathNodes = 0;
    const colors = Object.keys(COLORS);

    for (const color of colors) {
      const path = paths[color];
      if (path.length < 2) { allConnected = false; break; }
      let endpoints = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (LEVEL[r][c] === color) endpoints.push({ r, c });
        }
      }
      const pStart = path[0];
      const pEnd = path[path.length - 1];
      const startMatches = (pStart.r === endpoints[0].r && pStart.c === endpoints[0].c) ||
                           (pStart.r === endpoints[1].r && pStart.c === endpoints[1].c);
      const endMatches = (pEnd.r === endpoints[0].r && pEnd.c === endpoints[0].c) ||
                         (pEnd.r === endpoints[1].r && pEnd.c === endpoints[1].c);
      if (!startMatches || !endMatches) { allConnected = false; break; }
      totalPathNodes += path.length;
    }

    if (allConnected && totalPathNodes === GRID_SIZE * GRID_SIZE) {
      setIsCompleted(true);
    }
  };

  const resetPuzzle = () => {
    setPaths({ red: [], blue: [], green: [], yellow: [] });
    setActiveColor(null);
    setIsCompleted(false);
    setMoveCount(0);
  };

  const switchLevel = (idx) => {
    setCurrentLevel(idx);
    setPaths({ red: [], blue: [], green: [], yellow: [] });
    setActiveColor(null);
    setIsCompleted(false);
    setMoveCount(0);
  };

  const renderPaths = () => {
    if (!gridRef.current) return null;
    const cellWidth = 100 / GRID_SIZE;
    return Object.keys(paths).map(color => {
      const path = paths[color];
      if (path.length < 2) return null;
      const points = path.map(p => {
        const x = (p.c + 0.5) * cellWidth;
        const y = (p.r + 0.5) * cellWidth;
        return `${x},${y}`;
      }).join(' ');
      return (
        <polyline
          key={color}
          points={points}
          fill="none"
          stroke={COLORS[color]}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="svg-path"
          style={{ opacity: isCompleted ? 1 : 0.8 }}
        />
      );
    });
  };

  return (
    <div
      className="hex-container"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="hex-header">
        <h2 className="hex-title">HEX_CONNECT</h2>
        <div className="hex-header-right">
          <span className="move-badge">MOVES: {moveCount}</span>
          <button className="hex-reset" onClick={resetPuzzle}>REBOOT</button>
        </div>
      </div>

      {/* Level selector */}
      <div className="level-selector">
        {LEVELS.map((lvl, i) => (
          <button
            key={lvl.id}
            className={`level-btn ${i === currentLevel ? 'active' : ''}`}
            onClick={() => switchLevel(i)}
          >
            {lvl.name}
          </button>
        ))}
      </div>

      <div className={`hex-gameboard ${isCompleted ? 'completed' : ''}`} ref={gridRef}>
        <svg className="hex-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {renderPaths()}
        </svg>

        <div className="hex-grid">
          {Array.from({ length: GRID_SIZE }).map((_, r) => (
            <div key={r} className="hex-row">
              {Array.from({ length: GRID_SIZE }).map((_, c) => {
                const nodeColor = LEVEL[r][c];
                let pathColorHere = null;
                Object.keys(paths).forEach(color => {
                  if (paths[color].some(p => p.r === r && p.c === c)) {
                    pathColorHere = color;
                  }
                });

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`hex-cell ${activeColor ? 'drawing' : ''}`}
                    onPointerDown={(e) => {
                      e.target.releasePointerCapture(e.pointerId);
                      handlePointerDown(r, c, nodeColor);
                    }}
                    onPointerEnter={() => handlePointerEnter(r, c)}
                  >
                    {nodeColor && (
                      <div
                        className="hex-dot"
                        style={{
                          backgroundColor: COLORS[nodeColor],
                          boxShadow: `0 0 15px ${COLORS[nodeColor]}`,
                          transform: pathColorHere === nodeColor ? 'scale(1.2)' : 'scale(1)'
                        }}
                      />
                    )}
                    {!nodeColor && pathColorHere && (
                      <div
                        className="hex-path-dot"
                        style={{ backgroundColor: COLORS[pathColorHere] }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {isCompleted && (
          <div className="hex-overlay">
            <h3>CIRCUIT COMPLETE</h3>
            <p className="completion-stats">Solved in {moveCount} moves</p>
            {currentLevel < LEVELS.length - 1 ? (
              <button className="hex-reset mt-4" onClick={() => switchLevel(currentLevel + 1)}>
                NEXT LEVEL →
              </button>
            ) : (
              <button className="hex-reset mt-4" onClick={resetPuzzle}>ALL CLEARED!</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HexConnect;
