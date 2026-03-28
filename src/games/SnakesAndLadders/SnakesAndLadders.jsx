import React, { useEffect, useMemo, useState } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './SnakesAndLadders.css';

const MAX_PLAYERS = 4;
const PLAYER_COLORS = ['#3b82f6', '#ec4899', '#f8fafc', '#10b981']; // Blue, Pink, White, Green (Poki style)

const SPECIALS = {
  // Ladders (Go Up)
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
  // Snakes (Go Down)
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78
};

const defaultState = {
  phase: 'LOBBY',
  seats: [],
  positions: {}, // { playerId: 0 }
  turn: 0,
  dice: null, // the active dice required to move
  lastRoll: null, // { roll, by, ts }
  winner: null,
  logs: []
};

function getTileCoordinates(pos) {
  if (pos <= 0) return { x: 5, y: 102 }; // Start position safely tucked at bottom edge
  if (pos > 100) pos = 100;
  
  const zeroBased = pos - 1;
  const row = Math.floor(zeroBased / 10);
  const col = zeroBased % 10;
  
  const isLeftToRight = row % 2 === 0;
  const actualCol = isLeftToRight ? col : 9 - col;
  
  return {
    x: actualCol * 10 + 5,
    y: 100 - (row * 10 + 5)
  };
}

export default function SnakesAndLadders() {
  const multiplayerData = useMultiplayer('snakes-ladders');
  const { status, isOnline, localPlayerId, networkState, broadcastState, disconnect } = multiplayerData;

  const [gameState, setGameState] = useState(defaultState);

  // Sync network state locally
  useEffect(() => {
    if (isOnline && networkState && networkState.phase) {
      setGameState(networkState);
    }
  }, [isOnline, networkState]);

  const applyAndSync = (updater) => {
    setGameState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isOnline && status === 'connected') {
        broadcastState(next);
      }
      return next;
    });
  };

  const handleStartGame = (playerCount, activePlayers) => {
    const seats = activePlayers
      .slice(0, MAX_PLAYERS)
      .map((p, idx) => ({ ...p, seat: idx, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }));

    const positions = {};
    seats.forEach((seat) => {
      positions[seat.id] = 0; // 0 means starting area
    });

    applyAndSync({
      ...defaultState,
      phase: 'PLAY',
      seats,
      positions,
      logs: [{ text: 'Game started. The race to 100 begins!', ts: Date.now() }]
    });
  };

  const currentSeat = gameState.seats[gameState.turn];
  const isMyTurn = !isOnline || currentSeat?.id === localPlayerId;
  const mySeatIndex = gameState.seats.findIndex((s) => s.id === localPlayerId);

  // Add delay helper for animations
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const rollDice = async () => {
    if (gameState.phase !== 'PLAY' || !currentSeat || !isMyTurn) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const ts = Date.now();
    
    // First, broadcast the roll explicitly (so animation triggers for everyone immediately)
    applyAndSync((prev) => ({
      ...prev,
      lastRoll: { roll, by: currentSeat.id, ts },
      logs: [...prev.logs, { text: `${currentSeat.name || 'Player'} rolled ${roll}`, ts }].slice(-6)
    }));

    // Wait for dice rolling animation to finish visually (e.g. 600ms) before hopping
    await delay(700);

    // Apply token move
    applyAndSync((prev) => {
      const poses = { ...prev.positions };
      let finalPos = poses[currentSeat.id] + roll;
      
      // Exact hit to 100, or bounce back? Poki classic allows reaching 100 directly. Bouncing is optional but common. 
      // Let's implement absolute stopping at 100 (if roll exceeds, bounce back or just stay? We'll clamp to 100 for simplicity).
      if (finalPos > 100) {
        finalPos = 100 - (finalPos - 100); // Bounce back rule
      }

      // Check for Snakes or Ladders
      let landedOnSpecial = false;
      let targetPos = finalPos;
      if (SPECIALS[finalPos]) {
        landedOnSpecial = true;
        targetPos = SPECIALS[finalPos];
      }

      poses[currentSeat.id] = targetPos;

      const hasWon = targetPos === 100;
      const extraTurn = roll === 6 && !hasWon;

      let nextLogs = [...prev.logs];
      if (landedOnSpecial) {
        const isLadder = targetPos > finalPos;
        nextLogs.push({
          text: isLadder ? `Climbed a ladder to ${targetPos}!` : `Oh no! Bitten by a snake down to ${targetPos}.`,
          ts: Date.now() + 1
        });
      }
      
      if (hasWon) {
        nextLogs.push({ text: `${currentSeat.name || 'Player'} reached 100 and won!`, ts: Date.now() + 2 });
      }

      return {
        ...prev,
        positions: poses,
        turn: hasWon || extraTurn ? prev.turn : (prev.turn + 1) % prev.seats.length,
        winner: hasWon ? currentSeat.id : prev.winner,
        phase: hasWon ? 'FINISHED' : prev.phase,
        logs: nextLogs.slice(-6)
      };
    });
  };

  const resetToLobby = () => applyAndSync(defaultState);

  // Generate 100 board tiles
  const tiles = useMemo(() => {
    const arr = [];
    for (let r = 9; r >= 0; r--) {
      for (let c = 0; c < 10; c++) {
        const isLeftToRight = r % 2 === 0;
        const col = isLeftToRight ? c : 9 - c;
        const num = r * 10 + col + 1;
        
        // Poki style has alternating color patterns
        const isDark = (r + c) % 2 === 1;
        arr.push(
          <div key={`tile-${num}`} className={`sl-tile ${isDark ? 'sl-dark' : 'sl-light'}`}>
            <span className="sl-tile-num">{num}</span>
          </div>
        );
      }
    }
    return arr;
  }, []);

  const renderLaddersAndSnakes = useMemo(() => {
    return (
      <svg className="board-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Defining gradients/patterns for thick rich snakes & ladders */}
        <defs>
          <linearGradient id="ladder-wood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          {/* We will draw custom SVG styles inline below */}
        </defs>

        {Object.entries(SPECIALS).map(([start, end], idx) => {
          const sObj = getTileCoordinates(parseInt(start));
          const eObj = getTileCoordinates(parseInt(end));
          const isLadder = parseInt(end) > parseInt(start);

          if (isLadder) {
            // Draw a Ladder
            // Calculate angle and distance to place rungs properly, or just use a robust SVG path
            const dx = eObj.x - sObj.x;
            const dy = eObj.y - sObj.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            // Draw 2 side rails
            const railOffsetX = (dy / len) * 2.5; 
            const railOffsetY = -(dx / len) * 2.5;

            return (
              <g key={`ladder-${idx}`} className="ladder-group">
                <line x1={sObj.x - railOffsetX} y1={sObj.y - railOffsetY} x2={eObj.x - railOffsetX} y2={eObj.y - railOffsetY} stroke="url(#ladder-wood)" strokeWidth="1.5" strokeLinecap="round" className="ladder-rail" />
                <line x1={sObj.x + railOffsetX} y1={sObj.y + railOffsetY} x2={eObj.x + railOffsetX} y2={eObj.y + railOffsetY} stroke="url(#ladder-wood)" strokeWidth="1.5" strokeLinecap="round" className="ladder-rail" />
                {/* Rungs */}
                {Array.from({ length: Math.max(3, Math.floor(len / 4)) }).map((_, rIdx, arr) => {
                  const t = (rIdx + 1) / (arr.length + 1);
                  const mx = sObj.x + dx * t;
                  const my = sObj.y + dy * t;
                  return (
                    <line key={`rung-${rIdx}`} x1={mx - railOffsetX} y1={my - railOffsetY} x2={mx + railOffsetX} y2={my + railOffsetY} stroke="url(#ladder-wood)" strokeWidth="1.2" />
                  );
                })}
              </g>
            );
          } else {
            // Draw a Snake
            // We use an SVG cubic bezier path to give it a curved snake body
            const midX1 = sObj.x + (eObj.x - sObj.x) / 3 - 5;
            const midY1 = sObj.y + (eObj.y - sObj.y) / 3 - 5;
            const midX2 = sObj.x + 2 * (eObj.x - sObj.x) / 3 + 5;
            const midY2 = sObj.y + 2 * (eObj.y - sObj.y) / 3 + 5;
            
            // Generate distinct colors for snakes based on ID
            const snakeHues = [0, 120, 300, 30, 200];
            const hue = snakeHues[idx % snakeHues.length];

            return (
              <g key={`snake-${idx}`} className="snake-group">
                <path 
                  d={`M ${sObj.x} ${sObj.y} C ${midX1} ${midY1}, ${midX2} ${midY2}, ${eObj.x} ${eObj.y}`} 
                  fill="none" 
                  stroke={`hsl(${hue}, 80%, 40%)`} 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  className="snake-body"
                />
                {/* Snake Pattern Overlay */}
                <path 
                  d={`M ${sObj.x} ${sObj.y} C ${midX1} ${midY1}, ${midX2} ${midY2}, ${eObj.x} ${eObj.y}`} 
                  fill="none" 
                  stroke="rgba(0,0,0,0.3)" 
                  strokeWidth="3.5" 
                  strokeDasharray="2 4" 
                  strokeLinecap="round"
                />
                {/* Snake Head */}
                <circle cx={sObj.x} cy={sObj.y} r="3.5" fill={`hsl(${hue}, 80%, 40%)`} />
                <circle cx={sObj.x} cy={sObj.y} r="1.5" fill="#fff" />
                <circle cx={sObj.x + 0.5} cy={sObj.y - 0.5} r="0.75" fill="#000" />
              </g>
            );
          }
        })}
      </svg>
    );
  }, []);

  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="sl-wrapper">
        <MultiplayerLobby
          gameTitle="SNAKES & LADDERS"
          maxPlayers={MAX_PLAYERS}
          onStartLocal={handleStartGame}
          hookData={multiplayerData}
        />
      </div>
    );
  }

  const currentPlayerName = currentSeat?.name || `Player ${gameState.turn + 1}`;

  return (
    <div className="sl-wrapper playing">
      <div className="sl-main">
        {/* Left Sidebar (Turn indicators) */}
        <div className="sl-sidebar">
          <div className="sl-panel">
            <h3 className="panel-title">Players</h3>
            <div className="sl-players">
              {gameState.seats.map((seat, idx) => (
                <div key={seat.id} className={`sl-player-card ${idx === gameState.turn ? 'active' : ''}`} style={{ '--pcolor': seat.color }}>
                  <div className="sl-p-avatar" style={{ backgroundColor: seat.color }}>
                    {idx === gameState.turn && <span className="sl-turn-arrow">▶</span>}
                  </div>
                  <div className="sl-p-info">
                    <span className="sl-p-name">{seat.name || `Player ${idx + 1}`}</span>
                    <span className="sl-p-pos">Pos: {gameState.positions[seat.id]}</span>
                  </div>
                </div>
              ))}
            </div>
            {gameState.phase === 'FINISHED' && (
              <div className="sl-winner-banner" style={{ color: gameState.seats.find(s=>s.id === gameState.winner)?.color }}>
                🎉 WINNER!
              </div>
            )}
          </div>

          <div className="sl-panel sl-logs">
            {gameState.logs.map((log, i) => (
              <div key={log.ts + i} className="sl-log-line">{log.text}</div>
            ))}
          </div>
          
          <div className="sl-actions">
            <button className="sl-btn" onClick={resetToLobby}>Reset</button>
            <button className="sl-btn danger" onClick={disconnect}>Leave</button>
          </div>
        </div>

        {/* Center Board Frame */}
        <div className="sl-board-container">
          <div className="sl-board">
            <div className="sl-board-grid">
              {tiles}
            </div>
            
            {renderLaddersAndSnakes}

            {/* Start 'Nest' UI */}
            <div className="sl-start-nest" style={{ left: '5%', top: '105%' }}>
              Start
            </div>

            {/* Tokens */}
            {gameState.seats.map((seat, sIdx) => {
              const posVal = gameState.positions[seat.id];
              const { x, y } = getTileCoordinates(posVal);
              return (
                <div
                  key={seat.id}
                  className={`sl-token ${gameState.turn === sIdx ? 'active' : ''}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    backgroundColor: seat.color,
                    '--token-color': seat.color,
                    zIndex: posVal === 0 ? sIdx : posVal // Sort order by progression
                  }}
                >
                  <div className="sl-token-glint" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Dice Section */}
        <div className="sl-dice-section">
          <div className="sl-panel center-content">
            <div className="dice-turn-label" style={{ color: currentSeat?.color }}>
              {gameState.phase === 'FINISHED' ? 'Game Over' : `${currentPlayerName}'s Turn`}
            </div>
            <div className="sl-dice-container" onClick={rollDice}>
              <div 
                key={gameState.lastRoll?.ts || 'init'} 
                className={`sl-dice3d face-${gameState.lastRoll?.roll || 1} ${gameState.lastRoll?.ts ? 'rolling' : ''}`}
              >
                {/* 3D Dice faces mapping */}
                <div className="dice-side front"><span className="dot center"></span></div>
                <div className="dice-side back">
                  <span className="dot top-left"></span><span className="dot bottom-right"></span>
                </div>
                <div className="dice-side right">
                  <span className="dot top-left"></span><span className="dot center"></span><span className="dot bottom-right"></span>
                </div>
                <div className="dice-side left">
                  <span className="dot top-left"></span><span className="dot top-right"></span>
                  <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
                </div>
                <div className="dice-side top">
                  <span className="dot top-left"></span><span className="dot top-right"></span><span className="dot center"></span>
                  <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
                </div>
                <div className="dice-side bottom">
                  <span className="dot top-left"></span><span className="dot top-right"></span>
                  <span className="dot center-left"></span><span className="dot center-right"></span>
                  <span className="dot bottom-left"></span><span className="dot bottom-right"></span>
                </div>
              </div>
            </div>
            
            <button
              className="sl-roll-btn"
              onClick={rollDice}
              disabled={!isMyTurn || gameState.phase === 'FINISHED'}
              style={{ backgroundColor: isMyTurn ? currentSeat?.color : '#64748b' }}
            >
              {isMyTurn ? (gameState.lastRoll?.roll === 6 ? 'Roll Again' : 'Roll Dice') : 'Waiting...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
