import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { getBestMove } from './ai';
import { Piece } from './Pieces';
import { supabase } from '../../supabaseClient';
import './Chess.css';

const TIME_CONTROL_OPTIONS = [
  { value: 'off', label: 'No Clock', seconds: 0 },
  { value: '1', label: '1 Minute', seconds: 60 },
  { value: '3', label: '3 Minutes', seconds: 180 },
  { value: '5', label: '5 Minutes', seconds: 300 },
  { value: '10', label: '10 Minutes', seconds: 600 },
  { value: '15', label: '15 Minutes', seconds: 900 },
];

const getInitialClockSeconds = (value) => {
  const option = TIME_CONTROL_OPTIONS.find((item) => item.value === value);
  return option ? option.seconds : 0;
};

const formatClock = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const ChessGame = () => {
  const [chess] = useState(() => new Chess());
  const [board, setBoard] = useState(chess.board());
  const [status, setStatus] = useState('White to move');
  const [gameOver, setGameOver] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [mode, setMode] = useState('pvp');
  const [aiColor, setAiColor] = useState('b');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [timeControl, setTimeControl] = useState('off');
  const [whiteTime, setWhiteTime] = useState(getInitialClockSeconds('off'));
  const [blackTime, setBlackTime] = useState(getInitialClockSeconds('off'));

  const [roomPin, setRoomPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [playerColor, setPlayerColor] = useState('w');
  const [onlineStatus, setOnlineStatus] = useState('disconnected');

  const channelRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const aiTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  const clearAiTimeout = useCallback(() => {
    if (aiTimeoutRef.current) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    setIsAiThinking(false);
  }, []);

  const updateGameStatus = useCallback(() => {
    setBoard(chess.board());

    if (chess.isCheckmate()) {
      setStatus(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`);
      setGameOver(true);
      return;
    }

    if (chess.isDraw()) {
      setStatus('Game Over - Draw');
      setGameOver(true);
      return;
    }

    if (chess.isStalemate()) {
      setStatus('Game Over - Stalemate');
      setGameOver(true);
      return;
    }

    let currentStatus = `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
    if (chess.isCheck()) {
      currentStatus = `Check! ${currentStatus}`;
    }
    setStatus(currentStatus);
    setGameOver(false);
  }, [chess]);

  const pushHistorySnapshot = useCallback(() => {
    undoStackRef.current.push({
      fen: chess.fen(),
      whiteTime,
      blackTime,
    });
    redoStackRef.current = [];
  }, [blackTime, chess, whiteTime]);

  const loadSnapshot = useCallback((snapshot) => {
    chess.load(snapshot.fen);
    setWhiteTime(snapshot.whiteTime);
    setBlackTime(snapshot.blackTime);
    setSelectedSquare(null);
    setValidMoves([]);
    clearAiTimeout();
    updateGameStatus();
  }, [chess, clearAiTimeout, updateGameStatus]);

  const applyMove = useCallback((moveObj, { recordHistory = true, broadcast = false } = {}) => {
    if (recordHistory) {
      pushHistorySnapshot();
    }

    const move = chess.move(moveObj);
    if (!move) {
      if (recordHistory) {
        undoStackRef.current.pop();
      }
      return false;
    }

    setSelectedSquare(null);
    setValidMoves([]);
    updateGameStatus();

    if (broadcast && mode === 'online' && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'move',
        payload: { moveObj },
      });
    }

    return true;
  }, [chess, mode, pushHistorySnapshot, updateGameStatus]);

  const endGameOnTime = useCallback((color) => {
    clearAiTimeout();
    setSelectedSquare(null);
    setValidMoves([]);
    setGameOver(true);
    setStatus(`${color === 'w' ? 'White' : 'Black'} ran out of time. ${color === 'w' ? 'Black' : 'White'} wins.`);
  }, [clearAiTimeout]);

  useEffect(() => {
    if (timeControl === 'off' || mode === 'online' || gameOver) {
      return undefined;
    }

    const activeColor = chess.turn();

    const timerId = window.setInterval(() => {
      if (activeColor === 'w') {
        setWhiteTime((current) => {
          if (current <= 1) {
            window.clearInterval(timerId);
            endGameOnTime('w');
            return 0;
          }
          return current - 1;
        });
      } else {
        setBlackTime((current) => {
          if (current <= 1) {
            window.clearInterval(timerId);
            endGameOnTime('b');
            return 0;
          }
          return current - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [chess, endGameOnTime, gameOver, mode, timeControl, board]);

  useEffect(() => {
    if (mode !== 'pve' || gameOver || isAiThinking || chess.turn() !== aiColor) {
      return undefined;
    }

    setIsAiThinking(true);
    aiTimeoutRef.current = window.setTimeout(() => {
      const bestMove = getBestMove(chess, 3);
      if (bestMove) {
        applyMove(bestMove);
      }
      setIsAiThinking(false);
      aiTimeoutRef.current = null;
    }, 50);

    return () => {
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, [aiColor, applyMove, chess, gameOver, isAiThinking, mode, board]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (aiTimeoutRef.current) {
        window.clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  const leaveRoom = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setOnlineStatus('disconnected');
    setRoomPin('');
  };

  const resetGame = useCallback((nextTimeControl = timeControl) => {
    chess.reset();
    undoStackRef.current = [];
    redoStackRef.current = [];
    clearAiTimeout();
    setSelectedSquare(null);
    setValidMoves([]);
    setTimeControl(nextTimeControl);
    setWhiteTime(getInitialClockSeconds(nextTimeControl));
    setBlackTime(getInitialClockSeconds(nextTimeControl));
    setStatus('White to move');
    setGameOver(false);
    setBoard(chess.board());
  }, [chess, clearAiTimeout, timeControl]);

  const undoMove = useCallback(() => {
    if (mode === 'online' || undoStackRef.current.length === 0) {
      return;
    }

    const currentSnapshot = {
      fen: chess.fen(),
      whiteTime,
      blackTime,
    };

    const previousSnapshot = undoStackRef.current.pop();
    redoStackRef.current.push(currentSnapshot);
    loadSnapshot(previousSnapshot);

    if (mode === 'pve' && chess.turn() === aiColor && undoStackRef.current.length > 0) {
      const humanSnapshot = undoStackRef.current.pop();
      redoStackRef.current.push(previousSnapshot);
      loadSnapshot(humanSnapshot);
    }
  }, [aiColor, blackTime, chess, loadSnapshot, mode, whiteTime]);

  const redoMove = useCallback(() => {
    if (mode === 'online' || redoStackRef.current.length === 0) {
      return;
    }

    const currentSnapshot = {
      fen: chess.fen(),
      whiteTime,
      blackTime,
    };

    const nextSnapshot = redoStackRef.current.pop();
    undoStackRef.current.push(currentSnapshot);
    loadSnapshot(nextSnapshot);

    if (mode === 'pve' && chess.turn() === aiColor && redoStackRef.current.length > 0) {
      const followUpSnapshot = redoStackRef.current.pop();
      undoStackRef.current.push(nextSnapshot);
      loadSnapshot(followUpSnapshot);
    }
  }, [aiColor, blackTime, chess, loadSnapshot, mode, whiteTime]);

  const createRoom = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomPin(pin);
    setPlayerColor('w');
    if (channelRef.current) leaveRoom();

    resetGame();
    setOnlineStatus('waiting');

    const channel = supabase.channel(`chess-room-${pin}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'join' }, () => {
        setOnlineStatus('connected');
        channel.send({
          type: 'broadcast',
          event: 'start',
          payload: { fen: chess.fen(), starting: true },
        });
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        try {
          applyMove(payload.moveObj, { recordHistory: true });
        } catch (e) {
          console.error('Invalid move received', e);
        }
      })
      .subscribe();

    channelRef.current = channel;
  };

  const joinRoom = (pin) => {
    if (!pin || pin.length !== 4) return;
    setRoomPin(pin);
    setPlayerColor('b');
    if (channelRef.current) leaveRoom();

    resetGame();
    setOnlineStatus('waiting');

    const channel = supabase.channel(`chess-room-${pin}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'start' }, ({ payload }) => {
        chess.load(payload.fen);
        updateGameStatus();
        setOnlineStatus('connected');
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        try {
          applyMove(payload.moveObj, { recordHistory: true });
        } catch (e) {
          console.error('Invalid move received', e);
        }
      })
      .subscribe((statusValue) => {
        if (statusValue === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'join',
            payload: {},
          });
        }
      });

    channelRef.current = channel;
  };

  const handleSquareClick = (r, c) => {
    if (gameOver || isAiThinking || (mode === 'pve' && chess.turn() === aiColor)) return;
    if (mode === 'online' && (onlineStatus !== 'connected' || chess.turn() !== playerColor)) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    let visualR = r;
    let visualC = c;
    if (mode === 'online' && playerColor === 'b') {
      visualR = 7 - r;
      visualC = 7 - c;
    }

    const square = files[visualC] + ranks[visualR];
    const piece = chess.get(square);

    if (selectedSquare) {
      const isMoveValid = validMoves.some((move) => move.to === square);

      if (isMoveValid) {
        try {
          const moveObj = {
            from: selectedSquare,
            to: square,
            promotion: 'q',
          };

          const moveApplied = applyMove(moveObj, { recordHistory: true, broadcast: mode === 'online' });
          if (moveApplied) {
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const handleModeChange = (nextMode) => {
    if (channelRef.current && mode === 'online' && nextMode !== 'online') {
      leaveRoom();
    }
    if (channelRef.current && mode !== 'online' && nextMode === 'online') {
      leaveRoom();
    }
    setMode(nextMode);
    resetGame();
  };

  const handleTimeControlChange = (nextTimeControl) => {
    resetGame(nextTimeControl);
  };

  const renderSquares = () => {
    const squares = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let boardR = r;
        let boardC = c;
        if (mode === 'online' && playerColor === 'b') {
          boardR = 7 - r;
          boardC = 7 - c;
        }

        const isLight = (r + c) % 2 === 0;
        const squareId = files[boardC] + ranks[boardR];
        const piece = board[boardR][boardC];

        const isSelected = selectedSquare === squareId;
        const validMove = validMoves.find((move) => move.to === squareId);
        const isCapture = validMove && piece;

        let classNames = `chess-square ${isLight ? 'light' : 'dark'}`;
        if (isSelected) classNames += ' selected';
        if (validMove) classNames += ' valid-move';
        if (isCapture) classNames += ' has-piece';

        squares.push(
          <div
            key={`${r}-${c}`}
            className={classNames}
            onClick={() => handleSquareClick(boardR, boardC)}
          >
            {piece && <Piece type={piece.type} color={piece.color} className="chess-piece" />}
          </div>
        );
      }
    }

    return squares;
  };

  const currentTurn = chess.turn();
  const gameOverTitle = status.includes('Checkmate')
    ? 'Checkmate'
    : status.includes('ran out of time')
      ? 'Time Out'
      : status.includes('Stalemate')
        ? 'Stalemate'
        : 'Draw';
  const historyDisabled = mode === 'online';

  return (
    <div className="chess-container" ref={containerRef}>
      <div className="chess-header">
        <h2 className="chess-title">Grandmaster Engine</h2>
        <div className="chess-status">
          {isAiThinking ? 'AI is thinking...' : status}
        </div>
        <div className="chess-clocks">
          <div className={`chess-clock ${currentTurn === 'w' && !gameOver ? 'active' : ''}`}>
            <span>White</span>
            <strong>{formatClock(whiteTime)}</strong>
          </div>
          <div className={`chess-clock ${currentTurn === 'b' && !gameOver ? 'active' : ''}`}>
            <span>Black</span>
            <strong>{formatClock(blackTime)}</strong>
          </div>
        </div>
      </div>

      <div className="chess-toolbar">
        <div className="chess-mode-toggle">
          <button
            className={`chess-btn ${mode === 'pvp' ? 'active' : ''}`}
            onClick={() => handleModeChange('pvp')}
          >
            2 Player
          </button>
          <button
            className={`chess-btn ${mode === 'pve' ? 'active' : ''}`}
            onClick={() => handleModeChange('pve')}
          >
            VS AI (Alpha-Beta)
          </button>
          <button
            className={`chess-btn ${mode === 'online' ? 'active' : ''}`}
            onClick={() => handleModeChange('online')}
          >
            Online Friend
          </button>
        </div>

        <div className="chess-actions">
          <label className={`time-control ${historyDisabled ? 'disabled' : ''}`}>
            <span>Time</span>
            <select
              value={timeControl}
              onChange={(e) => handleTimeControlChange(e.target.value)}
              disabled={mode === 'online'}
            >
              {TIME_CONTROL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="move-controls">
            <button className="chess-btn" onClick={undoMove} disabled={historyDisabled || undoStackRef.current.length === 0}>
              Undo
            </button>
            <button className="chess-btn" onClick={redoMove} disabled={historyDisabled || redoStackRef.current.length === 0}>
              Redo
            </button>
            <button className="chess-btn" onClick={() => resetGame()}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {mode === 'online' && (
        <div className="online-room-controls">
          {onlineStatus === 'disconnected' && (
            <div className="room-setup">
              <button className="chess-btn create-room-btn" onClick={createRoom}>
                Create Room (Get PIN)
              </button>
              <div className="join-room">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter 4-digit PIN"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="pin-input"
                />
                <button
                  className="chess-btn join-room-btn"
                  onClick={() => joinRoom(inputPin)}
                  disabled={inputPin.length !== 4}
                >
                  Join
                </button>
              </div>
            </div>
          )}
          {onlineStatus === 'waiting' && (
            <div className="room-info">
              <p>Room PIN: <strong>{roomPin}</strong></p>
              <p>Waiting for opponent...</p>
            </div>
          )}
          {onlineStatus === 'connected' && (
            <div className="room-info">
              <p>Room PIN: <strong>{roomPin}</strong></p>
              <p>Connected! Playing as {playerColor === 'w' ? 'White' : 'Black'}</p>
            </div>
          )}
        </div>
      )}

      {mode === 'online' && (
        <div className="chess-mode-note">Undo, redo, and clock controls stay local in this version of online play.</div>
      )}

      <div className="chess-board-wrapper">
        <div className={`chess-board-grid ${(mode === 'online' && playerColor === 'b') ? 'flipped' : ''}`}>
          {renderSquares()}
        </div>

        {gameOver && (
          <div className="chess-game-over">
            <h3>{gameOverTitle}</h3>
            <button className="reset-btn" onClick={() => resetGame()}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessGame;