import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { getBestMove } from './ai';
import { Piece } from './Pieces';
import { supabase } from '../../supabaseClient';
import './Chess.css';

const ChessGame = () => {
  const [chess] = useState(() => new Chess());
  const [board, setBoard] = useState(chess.board());
  const [status, setStatus] = useState('White to move');
  const [gameOver, setGameOver] = useState(false);
  
  // Game states
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [mode, setMode] = useState('pvp'); // 'pvp', 'pve', 'online'
  const [aiColor, setAiColor] = useState('b'); // AI plays black by default
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Online Multiplayer states
  const [roomPin, setRoomPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [playerColor, setPlayerColor] = useState('w');
  const [onlineStatus, setOnlineStatus] = useState('disconnected'); // disconnected, waiting, connected
  const channelRef = useRef(null);

  const containerRef = useRef(null);

  const updateGameStatus = useCallback(() => {
    setBoard(chess.board());
    
    if (chess.isCheckmate()) {
      setStatus(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`);
      setGameOver(true);
    } else if (chess.isDraw()) {
      setStatus('Game Over - Draw');
      setGameOver(true);
    } else if (chess.isStalemate()) {
      setStatus('Game Over - Stalemate');
      setGameOver(true);
    } else {
      let currentStatus = `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
      if (chess.isCheck()) {
        currentStatus = `Check! ${currentStatus}`;
      }
      setStatus(currentStatus);
      setGameOver(false);
    }
  }, [chess]);

  // AI Move triggered when AI's turn
  useEffect(() => {
    if (mode === 'pve' && !gameOver && chess.turn() === aiColor && !isAiThinking) {
      setIsAiThinking(true);
      // Small timeout to allow UI update
      setTimeout(() => {
        const bestMove = getBestMove(chess, 3);
        if (bestMove) {
          chess.move(bestMove);
        }
        updateGameStatus();
        setIsAiThinking(false);
      }, 50);
    }
  }, [chess.turn(), mode, gameOver, isAiThinking, aiColor, updateGameStatus]);

  // Subscriptions cleanup
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
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

  const createRoom = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomPin(pin);
    setPlayerColor('w');
    if (channelRef.current) leaveRoom();

    resetGame();
    setOnlineStatus('waiting');

    const channel = supabase.channel(`chess-room-${pin}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'join' }, () => {
        setOnlineStatus('connected');
        channel.send({
          type: 'broadcast',
          event: 'start',
          payload: { fen: chess.fen(), starting: true }
        });
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        try {
          chess.move(payload.moveObj);
          updateGameStatus();
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
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'start' }, ({ payload }) => {
        chess.load(payload.fen);
        updateGameStatus();
        setOnlineStatus('connected');
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        try {
          chess.move(payload.moveObj);
          updateGameStatus();
        } catch (e) {
          console.error('Invalid move received', e);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'join',
            payload: {}
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
    // Invert board visual for black player if playing online
    let visualR = r;
    let visualC = c;
    if (mode === 'online' && playerColor === 'b') {
      visualR = 7 - r;
      visualC = 7 - c;
    }
    
    const square = files[visualC] + ranks[visualR];
    const piece = chess.get(square);

    // If a square is already selected, try to move there
    if (selectedSquare) {
      // Find out if the clicked square is valid move
      const isMoveValid = validMoves.some(m => m.to === square);

      if (isMoveValid) {
        try {
          // If promotion, auto-promote to queen for simplicity
          const moveObj = {
            from: selectedSquare,
            to: square,
            promotion: 'q'
          };
          chess.move(moveObj);
          setSelectedSquare(null);
          setValidMoves([]);
          updateGameStatus();

          // Broadcast if online
          if (mode === 'online' && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'move',
              payload: { moveObj }
            });
          }
          return;
        } catch (e) {
          // invalid move silently fails
          console.error(e);
        }
      }
    }

    // Selecting a piece
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      // Get valid moves for this piece
      const moves = chess.moves({ square, verbose: true });
      setValidMoves(moves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    chess.reset();
    setSelectedSquare(null);
    setValidMoves([]);
    setIsAiThinking(false);
    updateGameStatus();
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
        const validMove = validMoves.find(m => m.to === squareId);
        const isCapture = validMove && piece; // target square has a piece

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

  return (
    <div className="chess-container" ref={containerRef}>
      <div className="chess-header">
        <h2 className="chess-title">Grandmaster Engine</h2>
        <div className="chess-status">
          {isAiThinking ? 'AI is thinking...' : status}
        </div>
      </div>

      <div className="chess-mode-toggle">
        <button 
          className={`chess-btn ${mode === 'pvp' ? 'active' : ''}`}
          onClick={() => { setMode('pvp'); resetGame(); }}
        >
          2 Player
        </button>
        <button 
          className={`chess-btn ${mode === 'pve' ? 'active' : ''}`}
          onClick={() => { setMode('pve'); resetGame(); }}
        >
          VS AI (Alpha-Beta)
        </button>
        <button 
          className={`chess-btn ${mode === 'online' ? 'active' : ''}`}
          onClick={() => { setMode('online'); resetGame(); }}
        >
          Online Friend
        </button>
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

      <div className="chess-board-wrapper">
        <div className={`chess-board-grid ${(mode === 'online' && playerColor === 'b') ? 'flipped' : ''}`}>
          {renderSquares()}
        </div>

        {gameOver && (
          <div className="chess-game-over">
            <h3>{status.includes('Checkmate') ? 'Checkmate' : 'Draw'}</h3>
            <button className="reset-btn" onClick={resetGame}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessGame;