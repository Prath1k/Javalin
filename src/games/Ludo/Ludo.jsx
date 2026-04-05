import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './Ludo.css';

const MAX_PLAYERS = 4;
const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_HEX = { red: '#e74c3c', green: '#2ecc71', yellow: '#f1c40f', blue: '#3498db' };
const COLOR_NAMES = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const START_OFFSETS = [0, 13, 26, 39];

const MAIN_TRACK = [
  {r:6,c:1},{r:6,c:2},{r:6,c:3},{r:6,c:4},{r:6,c:5},
  {r:5,c:6},{r:4,c:6},{r:3,c:6},{r:2,c:6},{r:1,c:6},{r:0,c:6},
  {r:0,c:7},{r:0,c:8},
  {r:1,c:8},{r:2,c:8},{r:3,c:8},{r:4,c:8},{r:5,c:8},
  {r:6,c:9},{r:6,c:10},{r:6,c:11},{r:6,c:12},{r:6,c:13},{r:6,c:14},
  {r:7,c:14},{r:8,c:14},
  {r:8,c:13},{r:8,c:12},{r:8,c:11},{r:8,c:10},{r:8,c:9},
  {r:9,c:8},{r:10,c:8},{r:11,c:8},{r:12,c:8},{r:13,c:8},{r:14,c:8},
  {r:14,c:7},{r:14,c:6},
  {r:13,c:6},{r:12,c:6},{r:11,c:6},{r:10,c:6},{r:9,c:6},
  {r:8,c:5},{r:8,c:4},{r:8,c:3},{r:8,c:2},{r:8,c:1},{r:8,c:0},
  {r:7,c:0},{r:6,c:0},
];

const HOME_LANES = {
  red:    [{r:7,c:1},{r:7,c:2},{r:7,c:3},{r:7,c:4},{r:7,c:5},{r:7,c:6}],
  green:  [{r:1,c:7},{r:2,c:7},{r:3,c:7},{r:4,c:7},{r:5,c:7},{r:6,c:7}],
  yellow: [{r:7,c:13},{r:7,c:12},{r:7,c:11},{r:7,c:10},{r:7,c:9},{r:7,c:8}],
  blue:   [{r:13,c:7},{r:12,c:7},{r:11,c:7},{r:10,c:7},{r:9,c:7},{r:8,c:7}],
};

const YARD_POSITIONS = {
  red:    [{r:2,c:2},{r:2,c:4},{r:4,c:2},{r:4,c:4}],
  green:  [{r:2,c:10},{r:2,c:12},{r:4,c:10},{r:4,c:12}],
  yellow: [{r:10,c:10},{r:10,c:12},{r:12,c:10},{r:12,c:12}],
  blue:   [{r:10,c:2},{r:10,c:4},{r:12,c:2},{r:12,c:4}],
};

const getGlobalIndex = (seatIndex, steps) => {
  if (steps < 0 || steps >= 51) return null;
  return (START_OFFSETS[seatIndex] + steps) % 52;
};

const getTokenGridPos = (color, seatIndex, steps, tokenIndex) => {
  if (steps === 57) return { r: 7, c: 7 };
  if (steps >= 51) {
    const homeIdx = steps - 51;
    const lane = HOME_LANES[color];
    if (homeIdx < lane.length) return lane[homeIdx];
    return { r: 7, c: 7 };
  }
  if (steps >= 0) {
    const globalIdx = getGlobalIndex(seatIndex, steps);
    if (globalIdx !== null && MAIN_TRACK[globalIdx]) return MAIN_TRACK[globalIdx];
  }
  const yard = YARD_POSITIONS[color];
  return yard[tokenIndex] || yard[0];
};

const defaultState = {
  phase: 'LOBBY', seats: [], tokens: {}, turn: 0,
  dice: null, awaitingMove: false, availableMoves: [],
  winner: null, lastRoll: null, rolling: false, captured: null, logs: []
};

function DiceFace({ value }) {
  const positions = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };
  return (
    <div className="ludo-dice-face">
      {(positions[value] || positions[1]).map((pos, i) => (
        <span key={i} className={`ludo-dice-pip ${pos}`} />
      ))}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#e74c3c', '#2ecc71', '#f1c40f', '#3498db', '#9b59b6', '#e67e22'][Math.floor(Math.random() * 6)],
      size: 6 + Math.random() * 8, rotation: Math.random() * 360,
    })), []);
  return (
    <div className="ludo-confetti">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          backgroundColor: p.color, width: p.size, height: p.size * 0.6, transform: `rotate(${p.rotation}deg)`,
        }} />
      ))}
    </div>
  );
}

export default function Ludo() {
  const multiplayerData = useMultiplayer('ludo-royale');
  const { status, isOnline, localPlayerId, networkState, broadcastState, disconnect } = multiplayerData;
  const [gameState, setGameState] = useState(defaultState);
  const [captureEffect, setCaptureEffect] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [visualDice, setVisualDice] = useState(1);
  const rollTimeoutRef = useRef(null);
  const logEndRef = useRef(null);

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
      ...p, seat: idx, color: COLORS[idx % COLORS.length],
      name: p.name || `Player ${idx + 1}`
    }));
    const tokens = {};
    seats.forEach((seat) => { tokens[seat.id] = [-1, -1, -1, -1]; });
    applyAndSync({ ...defaultState, phase: 'PLAY', seats, tokens,
      logs: [{ text: `🎲 Game started! ${COLOR_NAMES[seats[0].color]} goes first.`, ts: Date.now() }]
    });
  }, [applyAndSync]);

  const currentSeat = gameState.seats[gameState.turn];
  const isMyTurn = !isOnline || currentSeat?.id === localPlayerId;

  const getValidTokens = useCallback((seatIndex, roll, state) => {
    const player = state.seats[seatIndex];
    if (!player) return [];
    const tokenSteps = state.tokens[player.id] || [];
    const valid = [];
    tokenSteps.forEach((steps, idx) => {
      if (steps === -1) {
        if (roll === 6) valid.push(idx);
      } else if (steps >= 0 && steps < 57) {
        if (steps + roll <= 57) valid.push(idx);
      }
    });
    return valid;
  }, []);

  const advanceTurn = (state, extra) => extra ? state.turn : (state.turn + 1) % state.seats.length;

  const rollDice = useCallback(() => {
    if (gameState.phase !== 'PLAY' || !currentSeat || !isMyTurn || gameState.awaitingMove || diceRolling) return;
    setDiceRolling(true);
    setVisualDice(Math.floor(Math.random() * 6) + 1);
    const roll = Math.floor(Math.random() * 6) + 1;

    rollTimeoutRef.current = setTimeout(() => {
      setDiceRolling(false);
      const validMoves = getValidTokens(gameState.turn, roll, gameState);
      const noMoves = validMoves.length === 0;
      const ts = Date.now();
      const emoji = roll === 6 ? '🎯' : '🎲';
      const logText = `${emoji} ${currentSeat.name} rolled ${roll}${noMoves ? ' — no moves' : ''}${roll === 6 ? ' — Extra turn!' : ''}`;

      if (noMoves) {
        applyAndSync((prev) => ({
          ...prev, dice: roll, awaitingMove: false, availableMoves: [],
          turn: advanceTurn(prev, false),
          lastRoll: { roll, by: currentSeat.id, ts },
          logs: [...prev.logs, { text: logText, ts }].slice(-8)
        }));
      } else if (validMoves.length === 1) {
        // Auto-select single valid token
        applyAndSync((prev) => ({
          ...prev, dice: roll, awaitingMove: true, availableMoves: validMoves,
          lastRoll: { roll, by: currentSeat.id, ts },
          logs: [...prev.logs, { text: logText, ts }].slice(-8)
        }));
        // Auto-move after brief delay
        setTimeout(() => handleMove(validMoves[0]), 400);
      } else {
        applyAndSync((prev) => ({
          ...prev, dice: roll, awaitingMove: true, availableMoves: validMoves,
          lastRoll: { roll, by: currentSeat.id, ts },
          logs: [...prev.logs, { text: logText, ts }].slice(-8)
        }));
      }
    }, 700);
  }, [gameState, currentSeat, isMyTurn, diceRolling, applyAndSync, getValidTokens]);

  useEffect(() => { return () => { if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current); }; }, []);

  useEffect(() => {
    let interval;
    if (diceRolling) {
      interval = setInterval(() => {
        setVisualDice(Math.floor(Math.random() * 6) + 1);
      }, 70);
    } else {
      setVisualDice(gameState.lastRoll?.roll || 1);
    }
    return () => clearInterval(interval);
  }, [diceRolling, gameState.lastRoll?.roll]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [gameState.logs.length]);

  const handleMove = useCallback((tokenIndex) => {
    if (!currentSeat || !isMyTurn) return;

    setGameState(prev => {
      if (!prev.awaitingMove || !prev.availableMoves.includes(tokenIndex)) return prev;
      const roll = prev.dice;
      const tokens = { ...prev.tokens };
      const playerTokens = [...tokens[currentSeat.id]];
      const currentSteps = playerTokens[tokenIndex];
      const nextSteps = currentSteps === -1 ? 0 : currentSteps + roll;
      playerTokens[tokenIndex] = nextSteps;
      tokens[currentSeat.id] = playerTokens;

      let capturedInfo = null;
      const targetGlobal = getGlobalIndex(currentSeat.seat, nextSteps);
      if (targetGlobal !== null && !SAFE_SPOTS.includes(targetGlobal)) {
        prev.seats.forEach((seat) => {
          if (seat.id === currentSeat.id) return;
          const oppTokens = tokens[seat.id] ? [...tokens[seat.id]] : [];
          oppTokens.forEach((steps, idx) => {
            if (steps >= 0 && steps < 51) {
              if (getGlobalIndex(seat.seat, steps) === targetGlobal) {
                oppTokens[idx] = -1;
                capturedInfo = { color: seat.color, tokenIdx: idx };
              }
            }
          });
          tokens[seat.id] = oppTokens;
        });
      }

      if (capturedInfo) {
        const capturedPos = getTokenGridPos(currentSeat.color, currentSeat.seat, nextSteps, tokenIndex);
        setCaptureEffect({ r: capturedPos.r, c: capturedPos.c, ts: Date.now() });
        setTimeout(() => setCaptureEffect(null), 800);
      }

      const finished = tokens[currentSeat.id].every((s) => s >= 57);
      const reachedHome = nextSteps === 57;
      const extraTurn = (roll === 6 || reachedHome) && !finished;
      const wasCaptured = capturedInfo !== null;
      let logText = `${currentSeat.name} moved token ${tokenIndex + 1}`;
      if (currentSteps === -1) logText = `${currentSeat.name} entered a token`;
      if (wasCaptured) logText += ' 💥 captured!';
      if (nextSteps === 57) logText += ' ✅ Home!';
      const nextLogs = [...prev.logs, { text: logText, ts: Date.now() }];
      if (finished) nextLogs.push({ text: `🏆 ${currentSeat.name} wins!`, ts: Date.now() + 1 });

      const next = {
        ...prev, tokens, dice: null, awaitingMove: false, availableMoves: [],
        turn: finished ? prev.turn : advanceTurn(prev, extraTurn || wasCaptured),
        winner: finished ? currentSeat.id : prev.winner,
        phase: finished ? 'FINISHED' : prev.phase,
        logs: nextLogs.slice(-8)
      };
      if (isOnline && status === 'connected') broadcastState(next);
      return next;
    });
  }, [currentSeat, isMyTurn, isOnline, status, broadcastState]);

  const resetToLobby = () => applyAndSync(defaultState);

  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="ludo-shell">
        <MultiplayerLobby gameTitle="LUDO ROYALE" maxPlayers={MAX_PLAYERS}
          onStartLocal={handleStartGame} hookData={multiplayerData} />
        <div className="ludo-rules-card">
          <h4>📜 How to Play</h4>
          <div className="rules-grid">
            <div className="rule-item"><span className="rule-icon">🎲</span><p>Roll a <strong>6</strong> to enter a token.</p></div>
            <div className="rule-item"><span className="rule-icon">🏃</span><p>Move tokens around the board to home.</p></div>
            <div className="rule-item"><span className="rule-icon">💥</span><p>Land on opponents to send them back!</p></div>
            <div className="rule-item"><span className="rule-icon">🏆</span><p>First to get all 4 tokens home wins!</p></div>
          </div>
        </div>
      </div>
    );
  }

  const validForCurrent = gameState.awaitingMove ? gameState.availableMoves : [];
  const currentTokens = currentSeat ? (gameState.tokens[currentSeat.id] || []) : [];

  const describeTokenPos = (steps) => {
    if (steps === -1) return 'Yard';
    if (steps === 57) return 'Home';
    if (steps >= 51) return `Lane ${steps - 50}`;
    return `Track ${steps + 1}`;
  };

  // Build grid cells
  const gridCells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      let cellType = 'empty';
      let cellColor = '';
      let cellContent = null;
      let isSafe = false;

      const trackIdx = MAIN_TRACK.findIndex(t => t.r === r && t.c === c);
      if (trackIdx !== -1) {
        cellType = 'track';
        if (SAFE_SPOTS.includes(trackIdx)) { isSafe = true; cellContent = '★'; }
        if (trackIdx === 0) cellColor = 'red';
        else if (trackIdx === 13) cellColor = 'green';
        else if (trackIdx === 26) cellColor = 'yellow';
        else if (trackIdx === 39) cellColor = 'blue';
      }

      for (const [color, lane] of Object.entries(HOME_LANES)) {
        if (lane.findIndex(l => l.r === r && l.c === c) !== -1) {
          cellType = 'home-lane'; cellColor = color;
        }
      }

      if (r === 7 && c === 7) cellType = 'center';

      const inRedYard = r <= 5 && c <= 5;
      const inGreenYard = r <= 5 && c >= 9;
      const inYellowYard = r >= 9 && c >= 9;
      const inBlueYard = r >= 9 && c <= 5;

      if (inRedYard && cellType === 'empty') cellType = 'yard-red';
      if (inGreenYard && cellType === 'empty') cellType = 'yard-green';
      if (inYellowYard && cellType === 'empty') cellType = 'yard-yellow';
      if (inBlueYard && cellType === 'empty') cellType = 'yard-blue';

      for (const [color, positions] of Object.entries(YARD_POSITIONS)) {
        if (positions.findIndex(p => p.r === r && p.c === c) !== -1) {
          cellType = `yard-slot-${color}`;
        }
      }

      gridCells.push(
        <div key={`${r}-${c}`}
          className={`ludo-cell ${cellType} ${cellColor ? `color-${cellColor}` : ''} ${isSafe ? 'safe' : ''}`}>
          {cellContent && <span className="cell-star">{cellContent}</span>}
          {cellType === 'center' && <span className="center-home">🏠</span>}
          {captureEffect && captureEffect.r === r && captureEffect.c === c && (
            <div className="capture-burst" key={captureEffect.ts}>💥</div>
          )}
        </div>
      );
    }
  }

  // Build tokens with global per-cell stacking so overlapping tokens keep clear identity.
  const tokenElements = [];
  const allTokenPositions = [];
  const cellStacks = {};

  gameState.seats.forEach((seat, sIdx) => {
    const playerTokens = gameState.tokens[seat.id] || [];
    playerTokens.forEach((steps, tIdx) => {
      const pos = getTokenGridPos(seat.color, seat.seat, steps, tIdx);
      const cellKey = `${pos.r}-${pos.c}`;
      const tokenKey = `${seat.id}-${tIdx}`;
      allTokenPositions.push({ seat, sIdx, tIdx, steps, pos, cellKey, tokenKey });
      if (!cellStacks[cellKey]) cellStacks[cellKey] = [];
      cellStacks[cellKey].push(tokenKey);
    });
  });

  allTokenPositions.forEach(({ seat, sIdx, tIdx, steps, pos, cellKey, tokenKey }) => {
    const stackGroup = cellStacks[cellKey] || [];
    const stackIdx = stackGroup.indexOf(tokenKey);
    const totalStack = stackGroup.length;
    const isStacked = totalStack > 1;
    const playerInitial = seat.name?.[0]?.toUpperCase() || COLOR_NAMES[seat.color]?.[0] || 'P';
    const isInteractive = sIdx === gameState.turn && isMyTurn && validForCurrent.includes(tIdx);
    const isFinished = steps === 57;
    const offsets = [
      { x: -30, y: -30 }, { x: 30, y: -30 }, { x: -30, y: 30 }, { x: 30, y: 30 },
      { x: 0, y: -38 }, { x: 0, y: 38 }, { x: -38, y: 0 }, { x: 38, y: 0 }
    ];
    const stackOffset = totalStack > 1 ? offsets[stackIdx % offsets.length] : { x: 0, y: 0 };

    tokenElements.push(
      <div key={tokenKey}
        className={`ludo-token ${isInteractive ? 'selectable' : ''} ${isFinished ? 'finished' : ''} ${isStacked ? 'stacked' : ''} color-${seat.color}`}
        style={{
          gridRow: pos.r + 1, gridColumn: pos.c + 1,
          '--stack-x': `${stackOffset.x}%`,
          '--stack-y': `${stackOffset.y}%`,
          transform: `translate(var(--stack-x), var(--stack-y))`,
          zIndex: isInteractive ? 30 : 10,
        }}
        onClick={() => isInteractive && handleMove(tIdx)}
        onKeyDown={(e) => {
          if (!isInteractive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMove(tIdx);
          }
        }}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : -1}
        aria-label={`${COLOR_NAMES[seat.color]} token ${tIdx + 1} ${isInteractive ? 'selectable' : 'not selectable'}`}
        title={`${COLOR_NAMES[seat.color]} Token ${tIdx + 1}`}
      >
        <span className="token-num">{tIdx + 1}</span>
        {isStacked && !isFinished && <span className="token-stack-badge">{playerInitial}</span>}
        {isInteractive && <span className="token-ring" />}
      </div>
    );
  });

  const winnerSeat = gameState.seats.find(s => s.id === gameState.winner);

  return (
    <div className="ludo-shell playing">
      {gameState.phase === 'FINISHED' && <Confetti />}
      {gameState.phase === 'FINISHED' && winnerSeat && (
        <div className="ludo-winner-overlay">
          <div className="winner-card">
            <div className="winner-crown">👑</div>
            <h2 style={{ color: COLOR_HEX[winnerSeat.color] }}>{winnerSeat.name} Wins!</h2>
            <p>Congratulations!</p>
            <button className="ludo-btn primary" onClick={resetToLobby}>Play Again</button>
          </div>
        </div>
      )}

      <div className="ludo-layout">
        {/* LEFT: Controls + Players */}
        <div className="ludo-panel">
          {/* Dice section inline */}
          <div className="dice-section">
            <div className="turn-label" style={{ color: currentSeat ? COLOR_HEX[currentSeat.color] : '#fff' }}>
              {gameState.phase === 'FINISHED' ? '🎉 Game Over' : `${currentSeat?.name}'s Turn`}
            </div>
            <div className="turn-subtext">
              {gameState.phase === 'FINISHED'
                ? 'Match completed. Start a new round from below.'
                : gameState.awaitingMove
                  ? (isMyTurn ? 'Pick one highlighted token to move.' : `${currentSeat?.name} is choosing a token.`)
                  : (isMyTurn ? 'Roll the dice to continue.' : `Waiting for ${currentSeat?.name} to roll.`)}
            </div>
            <div className="dice-row">
              <div className={`dice-container ${diceRolling ? 'rolling' : ''} ${isMyTurn && !gameState.awaitingMove && gameState.phase === 'PLAY' && !diceRolling ? 'clickable' : ''}`}
                onClick={rollDice}>
                <div className="dice-cube" key={gameState.lastRoll?.ts || 'init'}>
                  <DiceFace value={visualDice} />
                </div>
              </div>
              <div className="dice-actions">
                <button className="ludo-btn primary roll-btn"
                  onClick={rollDice}
                  disabled={!isMyTurn || gameState.phase === 'FINISHED' || gameState.awaitingMove || diceRolling}
                  style={{ '--btn-color': currentSeat ? COLOR_HEX[currentSeat.color] : '#3498db' }}>
                  {diceRolling ? '🎲 Rolling...' : isMyTurn ? (gameState.awaitingMove ? '👆 Select Token' : '🎲 Roll Dice') : '⏳ Waiting...'}
                </button>
                {gameState.lastRoll?.roll === 6 && !diceRolling && <div className="six-badge">SIX! 🎯</div>}
                {gameState.awaitingMove && isMyTurn && <div className="move-hint">Tap a glowing token</div>}
              </div>
            </div>
          </div>

          {gameState.phase !== 'FINISHED' && (
            <div className="quick-move-panel">
              <div className="quick-move-title">Available Moves</div>
              {gameState.awaitingMove && isMyTurn ? (
                <div className="quick-move-list">
                  {validForCurrent.map((tokenIdx) => {
                    const steps = currentTokens[tokenIdx] ?? -1;
                    return (
                      <button
                        key={`quick-${tokenIdx}`}
                        className={`quick-move-token color-${currentSeat?.color || 'red'}`}
                        onClick={() => handleMove(tokenIdx)}
                      >
                        <span className="quick-token-num">Token {tokenIdx + 1}</span>
                        <span className="quick-token-pos">{describeTokenPos(steps)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="quick-move-placeholder">
                  {isMyTurn ? 'Roll to reveal playable tokens.' : 'Waiting for active player.'}
                </div>
              )}
            </div>
          )}

          {/* Players */}
          <div className="player-list">
            {gameState.seats.map((seat, idx) => {
              const tokensHome = (gameState.tokens[seat.id] || []).filter(s => s === 57).length;
              const isActive = idx === gameState.turn && gameState.phase !== 'FINISHED';
              const isLocalTurn = isActive && seat.id === localPlayerId;
              return (
                <div key={seat.id} className={`ludo-player-card ${isActive ? 'active' : ''} ${isLocalTurn ? 'local-turn' : ''}`}
                  style={{ '--player-color': COLOR_HEX[seat.color] }}>
                  <div className="player-avatar" style={{ background: COLOR_HEX[seat.color] }}>
                    {seat.name?.[0]?.toUpperCase() || (idx + 1)}
                  </div>
                  <div className="player-info">
                    <span className="player-name">{seat.name}</span>
                    <div className="token-progress">
                      {[0, 1, 2, 3].map(t => {
                        const tokenSteps = gameState.tokens[seat.id]?.[t] ?? -1;
                        const isHome = tokenSteps === 57;
                        const isActive = tokenSteps >= 0 && !isHome;
                        return (
                          <span key={t} className={`progress-dot ${isHome ? 'home' : isActive ? 'active' : ''}`}
                            style={{ 
                              background: isHome ? COLOR_HEX[seat.color] : isActive ? COLOR_HEX[seat.color] : undefined,
                              opacity: isActive ? 0.7 : 1,
                              borderColor: (isHome || isActive) ? COLOR_HEX[seat.color] : undefined
                            }} />
                        );
                      })}
                    </div>
                  </div>
                  {isActive && <span className="turn-indicator">◀</span>}
                </div>
              );
            })}
          </div>

          {/* Game Log */}
          <div className="ludo-log-panel">
            <h4 className="log-heading">Game Log</h4>
            <div className="log-entries">
              {gameState.logs.map((log, i) => (
                <div key={log.ts + i} className={`log-entry ${i === gameState.logs.length - 1 ? 'latest' : ''}`}>{log.text}</div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="control-actions">
            <button className="ludo-btn ghost" onClick={resetToLobby}>🔄 Reset</button>
            <button className="ludo-btn ghost danger" onClick={disconnect}>🚪 Leave</button>
          </div>
        </div>

        {/* RIGHT: Board */}
        <div className="ludo-board-wrapper">
          <div className="ludo-board">
            {gridCells}
            {tokenElements}
          </div>
        </div>
      </div>
    </div>
  );
}
