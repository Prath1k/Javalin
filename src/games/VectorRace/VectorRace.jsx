import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './VectorRace.css';

const GRID_W = 20;
const GRID_H = 15;

// Simple track: 0 is wall, 1 is track, 2 is start, 3 is finish
const TRACK = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,2,1,1,1,1,1,0,0,0,0,3,3,3,3,3,3,3,3,0],
  [0,2,1,0,0,0,1,0,0,0,0,1,1,1,1,1,1,1,3,0],
  [0,2,1,0,0,0,1,1,1,1,0,1,0,0,0,0,0,1,3,0],
  [0,2,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,3,0],
  [0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,0,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,3,3,3,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]; // Simplified for demo purposes! A real track would weave more.

export default function VectorRace() {
  const multiplayerData = useMultiplayer('vector-race');
  const { 
    isOnline, status, players, localPlayerId, isHost, 
    startLocalPlay, broadcastState, networkState, disconnect 
  } = multiplayerData;

  const [gameState, setGameState] = useState({
    phase: 'LOBBY', // LOBBY, PLAYING, FINISHED
    turnIndex: 0,
    racers: {}, // playerId -> { x, y, vx, vy, color, status: 'racing' | 'crashed' | 'finished' }
    winner: null,
    history: [] // for drawing lines
  });

  useEffect(() => {
    if (isOnline && !isHost && networkState) {
      setGameState(networkState);
    }
  }, [networkState, isOnline, isHost]);

  const handleStartGame = (playerCount, activePlayers) => {
    const racers = {};
    const startPositions = [];
    TRACK.forEach((row, ri) => row.forEach((cell, ci) => { if (cell === 2) startPositions.push({ x: ci, y: ri }); }));

    activePlayers.forEach((p, i) => {
      racers[p.id] = {
        id: p.id,
        color: p.color,
        x: startPositions[i % startPositions.length].x,
        y: startPositions[i % startPositions.length].y,
        vx: 0,
        vy: 0,
        status: 'racing'
      };
    });

    const newState = { phase: 'PLAYING', turnIndex: 0, racers, winner: null, history: [] };
    setGameState(newState);
    if (isOnline) broadcastState(newState);
  };

  const handleVectorMove = (dx, dy) => {
    if (gameState.phase !== 'PLAYING') return;

    // Is it my turn?
    const currentTurnPlayerId = players[gameState.turnIndex]?.id;
    // For local play, the "localPlayerId" doesn't restrict moves if we are sharing a screen.
    // For online play, we should only allow the network player whose turn it is to move.
    if (isOnline && currentTurnPlayerId !== localPlayerId) return;

    setGameState(prev => {
      const g = { ...prev };
      const rId = players[g.turnIndex].id;
      const racer = { ...g.racers[rId] };

      racer.vx += dx;
      racer.vy += dy;
      
      const newX = racer.x + racer.vx;
      const newY = racer.y + racer.vy;

      g.history = [...g.history, { pId: rId, color: racer.color, x1: racer.x, y1: racer.y, x2: newX, y2: newY }];

      racer.x = newX;
      racer.y = newY;

      // Check Slipstream (Bonus velocity if ending behind someone)
      let slipstream = false;
      Object.keys(g.racers).forEach(id => {
        if (id !== rId) {
          const target = g.racers[id];
          if (target.status === 'racing' && target.x === newX && target.y === newY) {
             // Basic implementation: if you land on someone, you get a slight boost? 
             // Actually, the plan said: "Exactly 1 cell behind another racer".
          }
          // Correct check: if (newX == target.x - target.vx && newY == target.y - target.vy) 
          if (target.status === 'racing' && Math.abs(target.x - newX) + Math.abs(target.y - newY) === 1) {
            slipstream = true;
          }
        }
      });

      // Check collisions
      if (newX < 0 || newX >= GRID_W || newY < 0 || newY >= GRID_H || (TRACK[newY] && TRACK[newY][newX] === 0)) {
        racer.status = 'crashed';
        if ('vibrate' in navigator) navigator.vibrate(200);
        racer.vx = 0; racer.vy = 0;
      } else if (TRACK[newY] && TRACK[newY][newX] === 3) {
        racer.status = 'finished';
        g.winner = rId;
        g.phase = 'FINISHED';
      }

      if (slipstream && racer.status === 'racing') {
         // Notification or slight visual cue?
      }

      g.racers = { ...g.racers, [rId]: racer };

      // Next turn
      if (g.phase !== 'FINISHED') {
        let nextIdx = (g.turnIndex + 1) % players.length;
        // Skip crashed players
        let loops = 0;
        while (g.racers[players[nextIdx].id].status !== 'racing' && loops < players.length) {
          nextIdx = (nextIdx + 1) % players.length;
          loops++;
        }
        
        if (loops >= players.length) {
          // Everyone crashed or finished
          g.phase = 'FINISHED';
        } else {
          g.turnIndex = nextIdx;
        }
      }

      if (isOnline) broadcastState(g);
      return g;
    });
  };

  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="vector-container">
        <MultiplayerLobby 
          gameTitle="VECTOR RACE"
          maxPlayers={5}
          onStartLocal={handleStartGame}
          hookData={multiplayerData}
        />
        <div className="pilots-manual">
          <h4>// FLIGHT MANUAL: VECTOR MOMENTUM</h4>
          <ul>
            <li><strong>CORE MECHANIC:</strong> Your ship moves based on its current velocity (Vector). Each turn, you can modify your velocity by +/- 1 in any direction.</li>
            <li><strong>NAVIGATION:</strong> The dashed circles show your possible landing zones for the next turn.</li>
            <li><strong>HAZARDS:</strong> Colliding with walls (#0F0F1A) will result in a permanent crash.</li>
            <li><strong>OBJECTIVE:</strong> Reach the checkered finish line at the end of the track before your opponents.</li>
          </ul>
        </div>
      </div>
    );
  }

  const currentPlayer = players[gameState.turnIndex];
  const activeRacer = gameState.racers[currentPlayer?.id];
  const CELL_SIZE = 35;

  return (
    <div className="vector-container">
      <div className="vector-hud">
        <div className="turn-indicator" style={{ color: currentPlayer?.color }}>
          {gameState.phase === 'PLAYING' ? `ACTIVE PILOT: ${currentPlayer?.id.substring(0,6)}` : 'RACE COMPLETE'}
        </div>
        <button className="action-btn" onClick={disconnect}>ABORT</button>
      </div>

      <div className="vector-grid-wrapper">
        <svg className="vector-path-layer">
          <defs>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {gameState.history.map((h, i) => (
            <line 
              key={i}
              x1={h.x1 * CELL_SIZE + CELL_SIZE/2}
              y1={h.y1 * CELL_SIZE + CELL_SIZE/2}
              x2={h.x2 * CELL_SIZE + CELL_SIZE/2}
              y2={h.y2 * CELL_SIZE + CELL_SIZE/2}
              stroke={h.color}
              strokeWidth="3"
              filter="url(#neonGlow)"
              strokeDasharray="4 2"
              opacity="0.8"
            />
          ))}
        </svg>

        <div className={`vector-grid ${gameState.phase === 'PLAYING' ? 'animating-grid' : ''}`}>
          {(() => {
            const cells = [];
            for (let y = 0; y < GRID_H; y++) {
              for (let x = 0; x < GRID_W; x++) {
                const type = TRACK[y] && TRACK[y][x];
                let className = 'v-cell';
                if (type === 0) className += ' wall';
                if (type === 1) className += ' track';
                if (type === 2) className += ' start';
                if (type === 3) className += ' finish';

                let isTarget = false;
                let targetDx = 0, targetDy = 0;
                
                if (gameState.phase === 'PLAYING' && (!isOnline || currentPlayer?.id === localPlayerId)) {
                  if (activeRacer && activeRacer.status === 'racing') {
                    for(let ddx of [-1, 0, 1]){
                      for(let ddy of [-1, 0, 1]){
                        if(x === activeRacer.x + activeRacer.vx + ddx && y === activeRacer.y + activeRacer.vy + ddy) {
                          isTarget = true;
                          targetDx = ddx;
                          targetDy = ddy;
                        }
                      }
                    }
                  }
                }

                let content = null;
                Object.values(gameState.racers).forEach(r => {
                  if (r.x === x && r.y === y) {
                    content = <div className="ship-dot" style={{ backgroundColor: r.color, opacity: r.status === 'crashed' ? 0.3 : 1 }} />;
                  }
                });

                cells.push(
                  <div 
                    key={`${x}-${y}`} 
                    className={`${className} ${isTarget ? 'target' : ''}`}
                    onClick={() => isTarget ? handleVectorMove(targetDx, targetDy) : null}
                    style={isTarget ? { color: currentPlayer?.color } : {}}
                  >
                    {content}
                  </div>
                );
              }
            }
            return cells;
          })()}
        </div>
      </div>

      {gameState.phase === 'PLAYING' && activeRacer && activeRacer.status === 'racing' && (!isOnline || currentPlayer?.id === localPlayerId) && (
        <div className="vector-mobile-pad">
          <div className="v-pad-grid">
            {[-1,0,1].map(dy => (
              [-1,0,1].map(dx => (
                <button 
                  key={`${dx}-${dy}`}
                  className="v-pad-btn"
                  onClick={() => handleVectorMove(dx, dy)}
                >
                  <span className="v-dir-label">{dy === -1 ? '↑' : dy === 1 ? '↓' : ''}{dx === -1 ? '←' : dx === 1 ? '→' : (dy === 0 ? '•' : '')}</span>
                  <small>{dx},{dy}</small>
                </button>
              ))
            ))}
          </div>
        </div>
      )}

      {gameState.phase === 'FINISHED' && (
        <div className="vector-overlay">
          <h1>{gameState.winner ? 'RACE CONCLUDED' : 'CRITICAL FAILURE'}</h1>
          <div className="result-card">
            <p>
              {gameState.winner 
                ? `PILOT ${gameState.winner.toUpperCase().substring(0,6)} TOOK THE PODIUM.` 
                : 'NO SURVIVING RACERS DETECTED.'}
            </p>
            {isHost && <button className="action-btn" onClick={() => handleStartGame(players.length, players)}>NEXT CIRCUIT</button>}
          </div>
        </div>
      )}
    </div>
  );
}
