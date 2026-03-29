import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './SnakesAndLadders.css';

const MAX_PLAYERS = 4;
const PLAYER_COLORS = ['#3b82f6', '#ec4899', '#f97316', '#10b981'];
const PLAYER_EMOJIS = ['🔵', '🩷', '🟠', '🟢'];

const SPECIALS = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
};

const defaultState = {
  phase: 'LOBBY', seats: [], positions: {}, turn: 0,
  dice: null, lastRoll: null, winner: null, animating: false, logs: []
};

function getTileCoordinates(pos) {
  if (pos <= 0) return { x: -5, y: 105 };
  if (pos > 100) pos = 100;
  const zeroBased = pos - 1;
  const row = Math.floor(zeroBased / 10);
  const col = zeroBased % 10;
  const actualCol = row % 2 === 0 ? col : 9 - col;
  return { x: actualCol * 10 + 5, y: 100 - (row * 10 + 5) };
}

function getTileColor(num) {
  const row = Math.floor((num - 1) / 10);
  const col = (num - 1) % 10;
  const isDark = (row + col) % 2 === 1;
  const colors = [
    { light: '#d4edda', dark: '#b8daff' },
    { light: '#fff3cd', dark: '#f5c6cb' },
    { light: '#d4edda', dark: '#b8daff' },
    { light: '#fff3cd', dark: '#f5c6cb' },
    { light: '#d4edda', dark: '#b8daff' },
  ];
  const pair = colors[Math.floor(row / 2) % colors.length];
  return isDark ? pair.dark : pair.light;
}

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: ['#3b82f6', '#ec4899', '#f97316', '#10b981', '#8b5cf6', '#f59e0b'][Math.floor(Math.random() * 6)],
      size: 6 + Math.random() * 10, rotation: Math.random() * 360,
    })), []);
  return (
    <div className="sal-confetti">
      {pieces.map(p => (
        <div key={p.id} className="sal-confetti-piece" style={{
          left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          backgroundColor: p.color, width: p.size, height: p.size * 0.6, transform: `rotate(${p.rotation}deg)`,
        }} />
      ))}
    </div>
  );
}

function DiceFace3D({ value }) {
  const positions = {
    1: ['center'], 2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };
  return (
    <div className="sal-dice-face">
      {(positions[value] || positions[1]).map((pos, i) => (
        <span key={i} className={`sal-pip ${pos}`} />
      ))}
    </div>
  );
}

export default function SnakesAndLadders() {
  const multiplayerData = useMultiplayer('snakes-ladders');
  const { status, isOnline, localPlayerId, networkState, broadcastState, disconnect } = multiplayerData;
  const [gameState, setGameState] = useState(defaultState);
  const [diceRolling, setDiceRolling] = useState(false);
  const [snakeEffect, setSnakeEffect] = useState(null);
  const [ladderEffect, setLadderEffect] = useState(null);
  const [bounceEffect, setBounceEffect] = useState(false);

  useEffect(() => {
    if (isOnline && networkState && networkState.phase) setGameState(networkState);
  }, [isOnline, networkState]);

  const applyAndSync = useCallback((updater) => {
    setGameState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isOnline && status === 'connected') broadcastState(next);
      return next;
    });
  }, [isOnline, status, broadcastState]);

  const handleStartGame = useCallback((playerCount, activePlayers) => {
    const seats = activePlayers.slice(0, MAX_PLAYERS).map((p, idx) => ({
      ...p, seat: idx, color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      name: p.name || `Player ${idx + 1}`
    }));
    const positions = {};
    seats.forEach((seat) => { positions[seat.id] = 0; });
    applyAndSync({ ...defaultState, phase: 'PLAY', seats, positions,
      logs: [{ text: '🏁 Race to 100! Roll the dice!', ts: Date.now() }]
    });
  }, [applyAndSync]);

  const currentSeat = gameState.seats[gameState.turn];
  const isMyTurn = !isOnline || currentSeat?.id === localPlayerId;

  const rollDice = useCallback(async () => {
    if (gameState.phase !== 'PLAY' || !currentSeat || !isMyTurn || diceRolling) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    const ts = Date.now();
    setDiceRolling(true);

    applyAndSync((prev) => ({
      ...prev,
      lastRoll: { roll, by: currentSeat.id, ts },
      logs: [...prev.logs, {
        text: `${PLAYER_EMOJIS[gameState.turn]} ${currentSeat.name} rolled ${roll}${roll === 6 ? ' — Extra turn!' : ''}`, ts
      }].slice(-10)
    }));

    await new Promise(r => setTimeout(r, 800));
    setDiceRolling(false);

    applyAndSync((prev) => {
      const poses = { ...prev.positions };
      const currentPos = poses[currentSeat.id];
      let rawTarget = currentPos + roll;
      let bounced = false;

      if (rawTarget > 100) {
        rawTarget = 100 - (rawTarget - 100);
        bounced = true;
      }

      let finalPos = rawTarget;
      let specialType = null;

      if (SPECIALS[rawTarget]) {
        finalPos = SPECIALS[rawTarget];
        specialType = finalPos > rawTarget ? 'ladder' : 'snake';
      }

      poses[currentSeat.id] = finalPos;
      const hasWon = finalPos === 100;
      const extraTurn = roll === 6 && !hasWon;
      let nextLogs = [...prev.logs];

      if (bounced) {
        nextLogs.push({ text: `↩️ Bounced back to ${rawTarget}`, ts: Date.now() });
        setBounceEffect(true);
        setTimeout(() => setBounceEffect(false), 600);
      }

      if (specialType === 'ladder') {
        nextLogs.push({ text: `🪜 Ladder! ${rawTarget} → ${finalPos}`, ts: Date.now() + 1 });
        setLadderEffect({ from: rawTarget, to: finalPos, ts: Date.now() });
        setTimeout(() => setLadderEffect(null), 1500);
      } else if (specialType === 'snake') {
        nextLogs.push({ text: `🐍 Snake! ${rawTarget} → ${finalPos}`, ts: Date.now() + 1 });
        setSnakeEffect({ from: rawTarget, to: finalPos, ts: Date.now() });
        setTimeout(() => setSnakeEffect(null), 1500);
      }

      if (hasWon) {
        nextLogs.push({ text: `🏆 ${currentSeat.name} wins!`, ts: Date.now() + 2 });
      }

      return {
        ...prev, positions: poses,
        turn: hasWon || extraTurn ? prev.turn : (prev.turn + 1) % prev.seats.length,
        winner: hasWon ? currentSeat.id : prev.winner,
        phase: hasWon ? 'FINISHED' : prev.phase,
        logs: nextLogs.slice(-10)
      };
    });
  }, [gameState, currentSeat, isMyTurn, diceRolling, applyAndSync]);

  const resetToLobby = () => applyAndSync(defaultState);

  const tiles = useMemo(() => {
    const arr = [];
    for (let r = 9; r >= 0; r--) {
      for (let c = 0; c < 10; c++) {
        const col = r % 2 === 0 ? c : 9 - c;
        const num = r * 10 + col + 1;
        const isLadder = SPECIALS[num] !== undefined && SPECIALS[num] > num;
        const isSnake = SPECIALS[num] !== undefined && SPECIALS[num] < num;
        arr.push(
          <div key={`tile-${num}`}
            className={`sal-tile ${isLadder ? 'ladder-start' : ''} ${isSnake ? 'snake-start' : ''}`}
            style={{ backgroundColor: getTileColor(num) }}>
            <span className="sal-tile-num">{num}</span>
            {num === 100 && <span className="finish-flag">🏁</span>}
            {isLadder && <span className="special-icon ladder-icon">🪜</span>}
            {isSnake && <span className="special-icon snake-icon">🐍</span>}
          </div>
        );
      }
    }
    return arr;
  }, []);

  const renderSpecials = useMemo(() => (
    <svg className="sal-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <filter id="sal-shadow"><feDropShadow dx="0.3" dy="0.5" stdDeviation="0.5" floodOpacity="0.3" /></filter>
      </defs>
      {Object.entries(SPECIALS).map(([start, end], idx) => {
        const sObj = getTileCoordinates(parseInt(start));
        const eObj = getTileCoordinates(parseInt(end));
        const isLadder = parseInt(end) > parseInt(start);

        if (isLadder) {
          const dx = eObj.x - sObj.x, dy = eObj.y - sObj.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const rox = (dy / len) * 2.0, roy = -(dx / len) * 2.0;
          const numRungs = Math.max(3, Math.floor(len / 5));
          return (
            <g key={`ladder-${idx}`} className="sal-ladder" filter="url(#sal-shadow)">
              <line x1={sObj.x - rox} y1={sObj.y - roy} x2={eObj.x - rox} y2={eObj.y - roy} stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
              <line x1={sObj.x + rox} y1={sObj.y + roy} x2={eObj.x + rox} y2={eObj.y + roy} stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" />
              {Array.from({ length: numRungs }).map((_, ri) => {
                const t = (ri + 1) / (numRungs + 1);
                const mx = sObj.x + dx * t, my = sObj.y + dy * t;
                return <line key={ri} x1={mx - rox} y1={my - roy} x2={mx + rox} y2={my + roy} stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />;
              })}
              <line x1={sObj.x - rox * 0.3} y1={sObj.y - roy * 0.3} x2={eObj.x - rox * 0.3} y2={eObj.y - roy * 0.3} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" strokeLinecap="round" />
            </g>
          );
        } else {
          const snakeColors = ['#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#c026d3', '#e11d48', '#4f46e5'];
          const mainColor = snakeColors[idx % snakeColors.length];
          const dx = eObj.x - sObj.x, dy = eObj.y - sObj.y;
          const mx = (sObj.x + eObj.x) / 2, my = (sObj.y + eObj.y) / 2;
          const px = -dy * 0.25, py = dx * 0.25;
          const path = `M ${sObj.x} ${sObj.y} C ${sObj.x + dx * 0.25 + px} ${sObj.y + dy * 0.25 + py}, ${mx - px} ${my - py}, ${mx} ${my} S ${sObj.x + dx * 0.75 + px} ${sObj.y + dy * 0.75 + py}, ${eObj.x} ${eObj.y}`;
          return (
            <g key={`snake-${idx}`} className="sal-snake" filter="url(#sal-shadow)">
              <path d={path} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="5" strokeLinecap="round" />
              <path d={path} fill="none" stroke={mainColor} strokeWidth="4" strokeLinecap="round" />
              <path d={path} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeDasharray="1.5 3" strokeLinecap="round" />
              <circle cx={sObj.x} cy={sObj.y} r="3.5" fill={mainColor} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
              <circle cx={sObj.x - 1} cy={sObj.y - 1.2} r="1.3" fill="#fff" />
              <circle cx={sObj.x + 1} cy={sObj.y - 1.2} r="1.3" fill="#fff" />
              <circle cx={sObj.x - 0.8} cy={sObj.y - 1.3} r="0.6" fill="#111" />
              <circle cx={sObj.x + 1.2} cy={sObj.y - 1.3} r="0.6" fill="#111" />
              <path d={`M ${sObj.x} ${sObj.y + 2} L ${sObj.x - 1} ${sObj.y + 4} M ${sObj.x} ${sObj.y + 2} L ${sObj.x + 1} ${sObj.y + 4}`}
                fill="none" stroke="#ef4444" strokeWidth="0.5" strokeLinecap="round" />
              <circle cx={eObj.x} cy={eObj.y} r="1.5" fill={mainColor} opacity="0.6" />
            </g>
          );
        }
      })}
    </svg>
  ), []);

  // ===== LOBBY =====
  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="sal-wrapper">
        <MultiplayerLobby gameTitle="SNAKES & LADDERS" maxPlayers={MAX_PLAYERS}
          onStartLocal={handleStartGame} hookData={multiplayerData} />
        <div className="sal-rules-card">
          <h4>📖 How to Play</h4>
          <div className="sal-rules-grid">
            <div className="sal-rule"><span className="sal-rule-icon">🎲</span><p>Roll dice & move forward.</p></div>
            <div className="sal-rule"><span className="sal-rule-icon">🪜</span><p>Land on a ladder to climb up!</p></div>
            <div className="sal-rule"><span className="sal-rule-icon">🐍</span><p>Land on a snake head to slide down.</p></div>
            <div className="sal-rule"><span className="sal-rule-icon">🏆</span><p>First to reach 100 wins!</p></div>
          </div>
        </div>
      </div>
    );
  }

  const winnerSeat = gameState.seats.find(s => s.id === gameState.winner);

  return (
    <div className={`sal-wrapper playing ${bounceEffect ? 'shake' : ''}`}>
      {gameState.phase === 'FINISHED' && <Confetti />}

      {snakeEffect && (
        <div className="sal-effect-toast snake-toast" key={snakeEffect.ts}>
          🐍 Snake! {snakeEffect.from} → {snakeEffect.to}
        </div>
      )}
      {ladderEffect && (
        <div className="sal-effect-toast ladder-toast" key={ladderEffect.ts}>
          🪜 Ladder! {ladderEffect.from} → {ladderEffect.to}
        </div>
      )}

      {gameState.phase === 'FINISHED' && winnerSeat && (
        <div className="sal-winner-overlay">
          <div className="sal-winner-card">
            <div className="sal-winner-crown">🏆</div>
            <h2 style={{ color: winnerSeat.color }}>{winnerSeat.name} Wins!</h2>
            <p>Reached square 100 first!</p>
            <button className="sal-action-btn primary" onClick={resetToLobby}>Play Again</button>
          </div>
        </div>
      )}

      <div className="sal-game-layout">
        {/* LEFT: Controls + Players */}
        <div className="sal-side-panel">
          {/* Dice section */}
          <div className="sal-panel-card sal-dice-card">
            <div className="sal-turn-label" style={{ color: currentSeat?.color }}>
              {gameState.phase === 'FINISHED' ? '🎉 Game Over!' : `${currentSeat?.name}'s Turn`}
            </div>
            <div className="sal-dice-row">
              <div className={`sal-dice-box ${diceRolling ? 'rolling' : ''} ${isMyTurn && gameState.phase === 'PLAY' && !diceRolling ? 'clickable' : ''}`}
                onClick={rollDice}>
                <div className="sal-dice-inner" key={gameState.lastRoll?.ts || 'init'}>
                  <DiceFace3D value={gameState.lastRoll?.roll || 1} />
                </div>
              </div>
              <div className="sal-dice-actions">
                <button className="sal-action-btn primary sal-roll-button"
                  onClick={rollDice}
                  disabled={!isMyTurn || gameState.phase === 'FINISHED' || diceRolling}
                  style={{ '--btn-color': currentSeat?.color || '#3b82f6' }}>
                  {diceRolling ? '🎲 Rolling...' : isMyTurn ? '🎲 Roll Dice' : '⏳ Waiting...'}
                </button>
                {gameState.lastRoll?.roll === 6 && !diceRolling && (
                  <div className="sal-six-badge">🎯 SIX! Roll Again!</div>
                )}
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="sal-panel-card">
            <h3 className="sal-panel-title">Players</h3>
            <div className="sal-players-list">
              {gameState.seats.map((seat, idx) => {
                const isActive = idx === gameState.turn && gameState.phase !== 'FINISHED';
                const pos = gameState.positions[seat.id] || 0;
                return (
                  <div key={seat.id} className={`sal-player-card ${isActive ? 'active' : ''}`}
                    style={{ '--pcolor': seat.color }}>
                    <div className="sal-player-avatar" style={{ backgroundColor: seat.color }}>
                      {seat.name?.[0]?.toUpperCase() || idx + 1}
                    </div>
                    <div className="sal-player-details">
                      <span className="sal-player-name">{seat.name}</span>
                      <div className="sal-progress-bar">
                        <div className="sal-progress-fill" style={{ width: `${pos}%`, backgroundColor: seat.color }} />
                      </div>
                      <span className="sal-pos-label">Tile {pos}</span>
                    </div>
                    {isActive && <span className="sal-active-indicator" style={{ color: seat.color }}>▶</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Log */}
          <div className="sal-panel-card sal-log-panel">
            <h4 className="sal-log-title">Game Log</h4>
            <div className="sal-log-entries">
              {gameState.logs.map((log, i) => (
                <div key={log.ts + i} className={`sal-log-entry ${i === gameState.logs.length - 1 ? 'latest' : ''}`}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

          <div className="sal-control-btns">
            <button className="sal-action-btn ghost" onClick={resetToLobby}>🔄 Reset</button>
            <button className="sal-action-btn ghost danger" onClick={disconnect}>🚪 Leave</button>
          </div>
        </div>

        {/* RIGHT: Board */}
        <div className="sal-board-area">
          <div className="sal-board-frame">
            <div className="sal-board">
              <div className="sal-grid">{tiles}</div>
              {renderSpecials}
              {gameState.seats.map((seat, sIdx) => {
                const posVal = gameState.positions[seat.id] || 0;
                const { x, y } = getTileCoordinates(posVal);
                const samePosList = gameState.seats.filter((s, i) =>
                  i !== sIdx && (gameState.positions[s.id] || 0) === posVal && posVal > 0
                );
                const totalOnTile = samePosList.length + 1;
                const myIdxOnTile = gameState.seats.filter((s, i) =>
                  i < sIdx && (gameState.positions[s.id] || 0) === posVal && posVal > 0
                ).length;
                const stackOffsets = [{ x: 0, y: 0 }, { x: 3, y: -2 }, { x: -2, y: 2 }, { x: 3, y: 2 }];
                const offset = totalOnTile > 1 ? stackOffsets[myIdxOnTile % 4] : { x: 0, y: 0 };
                return (
                  <div key={seat.id}
                    className={`sal-token ${gameState.turn === sIdx && gameState.phase !== 'FINISHED' ? 'active' : ''}`}
                    style={{
                      left: `${x + offset.x}%`, top: `${y + offset.y}%`,
                      backgroundColor: seat.color, '--token-color': seat.color, zIndex: 10 + sIdx
                    }}>
                    <span className="sal-token-label">{seat.name?.[0]?.toUpperCase() || sIdx + 1}</span>
                    <div className="sal-token-shine" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
