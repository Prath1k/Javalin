import React, { useEffect, useMemo, useState } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './Ludo.css';

const MAX_PLAYERS = 4;
const LUDO_COLORS = ['#e74c3c', '#27ae60', '#f1c40f', '#3498db'];
const START_OFFSETS = [0, 13, 26, 39];
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const BASE_POSITIONS = [
  { x: 18, y: 18 },
  { x: 82, y: 18 },
  { x: 82, y: 82 },
  { x: 18, y: 82 }
];
const TOKEN_OFFSETS = [
  { x: -4, y: -4 },
  { x: 4, y: -4 },
  { x: -4, y: 4 },
  { x: 4, y: 4 }
];

const defaultState = {
  phase: 'LOBBY',
  seats: [],
  tokens: {},
  turn: 0,
  dice: null,
  awaitingMove: false,
  availableMoves: [],
  winner: null,
  lastRoll: null,
  logs: []
};

const getGlobalIndex = (seatIndex, steps) => {
  if (steps < 0 || steps > 51) return null;
  return (START_OFFSETS[seatIndex] + steps) % 52;
};

export default function Ludo() {
  const multiplayerData = useMultiplayer('ludo-royale');
  const { status, isOnline, localPlayerId, networkState, broadcastState, disconnect } = multiplayerData;

  const trackPositions = useMemo(() => {
    const radius = 42;
    return Array.from({ length: 52 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 52 - Math.PI / 2;
      return {
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle)
      };
    });
  }, []);

  const homePaths = useMemo(() => {
    return START_OFFSETS.map((offset) => {
      const angle = (Math.PI * 2 * offset) / 52 - Math.PI / 2;
      return Array.from({ length: 6 }, (_, step) => {
        const radius = 32 - step * 5.2;
        return {
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle)
        };
      });
    });
  }, []);

  const [gameState, setGameState] = useState(defaultState);

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
      .map((p, idx) => ({ ...p, seat: idx, color: LUDO_COLORS[idx % LUDO_COLORS.length] }));

    const tokens = {};
    seats.forEach((seat) => {
      tokens[seat.id] = [-1, -1, -1, -1];
    });

    const next = {
      ...defaultState,
      phase: 'PLAY',
      seats,
      tokens,
      logs: [{ text: 'Game started', ts: Date.now() }]
    };
    applyAndSync(next);
  };

  const getTokenPosition = (seatIndex, steps, tokenIndex) => {
    if (steps === 57) return { x: 50, y: 50 };
    if (steps >= 52) return homePaths[seatIndex][steps - 52];
    if (steps >= 0) return trackPositions[getGlobalIndex(seatIndex, steps)];

    const base = BASE_POSITIONS[seatIndex];
    const offset = TOKEN_OFFSETS[tokenIndex];
    return { x: base.x + offset.x, y: base.y + offset.y };
  };

  const currentSeat = gameState.seats[gameState.turn];
  const isMyTurn = !isOnline || currentSeat?.id === localPlayerId;
  const mySeatIndex = gameState.seats.findIndex((s) => s.id === localPlayerId);

  const getValidTokens = (seatIndex, roll, state) => {
    const player = state.seats[seatIndex];
    if (!player) return [];
    const tokenSteps = state.tokens[player.id] || [];
    const valid = [];

    tokenSteps.forEach((steps, idx) => {
      if (steps === -1) {
        if (roll === 6) valid.push(idx);
      } else if (steps >= 0 && steps < 57) {
        const target = steps + roll;
        if (target <= 57) valid.push(idx);
      }
    });

    return valid;
  };

  const advanceTurn = (state, extraTurn) => {
    if (extraTurn) return state.turn;
    return (state.turn + 1) % state.seats.length;
  };

  const rollDice = () => {
    if (gameState.phase !== 'PLAY' || !currentSeat) return;
    if (!isMyTurn || gameState.awaitingMove) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const validMoves = getValidTokens(gameState.turn, roll, gameState);

    const noMoves = validMoves.length === 0;
    const ts = Date.now();
    const logEntry = {
      text: `${currentSeat.name || 'Player'} rolled ${roll}${noMoves ? ' (no moves)' : ''}`,
      ts
    };

    applyAndSync((prev) => {
      const nextLogs = [...prev.logs, logEntry].slice(-6);
      if (noMoves) {
        return {
          ...prev,
          dice: null,
          awaitingMove: false,
          availableMoves: [],
          turn: advanceTurn(prev, false),
          lastRoll: { roll, by: currentSeat?.id, ts },
          logs: nextLogs
        };
      }

      return {
        ...prev,
        dice: roll,
        awaitingMove: true,
        availableMoves: validMoves,
        lastRoll: { roll, by: currentSeat?.id, ts },
        logs: nextLogs
      };
    });
  };

  const handleMove = (tokenIndex) => {
    if (!currentSeat || !isMyTurn) return;
    if (!gameState.awaitingMove || !gameState.availableMoves.includes(tokenIndex)) return;
    const roll = gameState.dice;

    applyAndSync((prev) => {
      const tokens = { ...prev.tokens };
      const playerTokens = [...tokens[currentSeat.id]];
      const currentSteps = playerTokens[tokenIndex];
      const nextSteps = currentSteps === -1 ? 0 : currentSteps + roll;

      playerTokens[tokenIndex] = nextSteps;
      tokens[currentSeat.id] = playerTokens;

      const targetGlobal = getGlobalIndex(prev.turn, nextSteps);
      if (targetGlobal !== null && !SAFE_SPOTS.includes(targetGlobal)) {
        prev.seats.forEach((seat, sIdx) => {
          if (seat.id === currentSeat.id) return;
          const oppTokens = tokens[seat.id] ? [...tokens[seat.id]] : [];
          oppTokens.forEach((steps, idx) => {
            if (steps >= 0 && steps <= 51) {
              const oppGlobal = getGlobalIndex(sIdx, steps);
              if (oppGlobal === targetGlobal) {
                oppTokens[idx] = -1;
              }
            }
          });
          tokens[seat.id] = oppTokens;
        });
      }

      const finished = tokens[currentSeat.id].every((s) => s >= 57);
      const extraTurn = roll === 6 && !finished;

      const nextState = {
        ...prev,
        tokens,
        dice: null,
        awaitingMove: false,
        availableMoves: [],
        turn: finished ? prev.turn : advanceTurn(prev, extraTurn),
        winner: finished ? currentSeat.id : prev.winner,
        phase: finished ? 'FINISHED' : prev.phase,
        logs: [...prev.logs, { text: `${currentSeat.name || 'Player'} moved token ${tokenIndex + 1}`, ts: Date.now() }].slice(-6)
      };

      if (finished) {
        nextState.logs.push({ text: `${currentSeat.name || 'Player'} wins the match!`, ts: Date.now() });
      }

      return nextState;
    });
  };

  const resetToLobby = () => {
    applyAndSync(defaultState);
  };

  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="ludo-shell">
        <MultiplayerLobby
          gameTitle="LUDO ROYALE"
          maxPlayers={MAX_PLAYERS}
          onStartLocal={handleStartGame}
          hookData={multiplayerData}
        />
        <div className="ludo-rules">
          <h4>// LUDO BRIEFING</h4>
          <ul>
            <li>Roll a 6 to launch a pawn from your yard.</li>
            <li>Run the full loop, then dash up your home lane to finish.</li>
            <li>Land on rivals to send them home unless the tile is safe.</li>
            <li>Roll a 6 for an extra turn. First player to finish all 4 wins.</li>
          </ul>
        </div>
      </div>
    );
  }

  const currentPlayerName = currentSeat?.name || 'Player';
  const validForCurrent = gameState.awaitingMove ? gameState.availableMoves : [];

  return (
    <div className="ludo-shell">
      <div className="ludo-hud">
        <div className="turn-pill" style={{ borderColor: currentSeat?.color }}>
          <span className="dot" style={{ background: currentSeat?.color, color: currentSeat?.color || '#fff' }} />
          {gameState.phase === 'FINISHED'
            ? `${currentSeat?.id === gameState.winner ? 'Winner' : 'Game Over'}`
            : `Turn: ${currentPlayerName}`}
        </div>
        <div className="dice-card">
          <div 
            key={gameState.lastRoll?.ts || 'init'} 
            className={`dice-wrapper ${gameState.lastRoll ? 'rolling' : ''}`}
          >
            <div className={`dice-value face-${gameState.lastRoll?.roll || 0}`}>
              {gameState.lastRoll?.roll ? (
                Array.from({ length: gameState.lastRoll.roll }).map((_, i) => (
                  <span key={i} className="dice-dot" />
                ))
              ) : (
                <span className="dice-text">?</span>
              )}
            </div>
          </div>
          <button
            className="primary-btn"
            onClick={rollDice}
            disabled={!isMyTurn || gameState.phase === 'FINISHED'}
          >
            {isMyTurn ? 'Roll Dice' : 'Waiting'}
          </button>
        </div>
        <div className="actions">
          <button className="ghost-btn" onClick={resetToLobby}>Reset</button>
          <button className="ghost-btn danger" onClick={disconnect}>Leave</button>
        </div>
      </div>

      <div className="player-strip">
        {gameState.seats.map((seat, idx) => {
          const finished = gameState.tokens[seat.id]?.filter((s) => s === 57).length || 0;
          return (
            <div key={seat.id} className={`player-card ${idx === gameState.turn ? 'active' : ''}`} style={{ '--pc-color': seat.color }}>
              <div className="pc-header">
                <span className="pc-dot" style={{ background: seat.color, color: seat.color }} />
                <div className="pc-name">Player {idx + 1}</div>
              </div>
              <div className="pc-meta">Finished: {finished}/4</div>
            </div>
          );
        })}
      </div>

      <div className="ludo-board">
        <div className="board-bg" />
        <div className="corner-yard yard-red" aria-hidden>
          <div className="yard-center">Home</div>
        </div>
        <div className="corner-yard yard-green" aria-hidden>
          <div className="yard-center">Home</div>
        </div>
        <div className="corner-yard yard-yellow" aria-hidden>
          <div className="yard-center">Home</div>
        </div>
        <div className="corner-yard yard-blue" aria-hidden>
          <div className="yard-center">Home</div>
        </div>

        <div className="lane lane-red" aria-hidden />
        <div className="lane lane-green" aria-hidden />
        <div className="lane lane-yellow" aria-hidden />
        <div className="lane lane-blue" aria-hidden />
        {trackPositions.map((pos, idx) => (
          <div
            key={`cell-${idx}`}
            className={`track-cell ${SAFE_SPOTS.includes(idx) ? 'safe' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <span className="cell-mark" />
          </div>
        ))}

        {homePaths.map((path, pi) => (
          <React.Fragment key={`home-${pi}`}>
            {path.map((pos, step) => (
              <div
                key={`home-${pi}-${step}`}
                className="home-cell"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, borderColor: LUDO_COLORS[pi] }}
              />
            ))}
          </React.Fragment>
        ))}

        <div className="center-star">*</div>

        {gameState.seats.map((seat, sIdx) => (
          (gameState.tokens[seat.id] || []).map((steps, tIdx) => {
            const pos = getTokenPosition(sIdx, steps, tIdx);
            const isInteractive = isMyTurn && validForCurrent.includes(tIdx);
            return (
              <div
                key={`${seat.id}-${tIdx}`}
                className={`token ${isInteractive ? 'clickable' : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, background: seat.color }}
                onClick={() => handleMove(tIdx)}
              >
                <span className="token-label">{tIdx + 1}</span>
              </div>
            );
          })
        ))}
      </div>

      <div className="ludo-footer">
        <div className="legend">
          <span className="legend-dot" style={{ background: currentSeat?.color, color: currentSeat?.color || '#fff' }} /> You are Player {mySeatIndex + 1}
          {gameState.awaitingMove && <span className="legend-msg">Select a highlighted pawn</span>}
        </div>
        <div className="logs">
          {gameState.logs.map((log, i) => (
            <div key={log.ts + i} className="log-line">{log.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
