import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../../hooks/useMultiplayer';
import MultiplayerLobby from '../../components/MultiplayerLobby/MultiplayerLobby';
import './TheGlitch.css';

// --- GAME LOGIC STATES ---
// 1. LOBBY (handled by hook/UI)
// 2. ASSIGNMENT (Roles shown privately)
// 3. PLAYING (Grid fixing / sabotaging)
// 4. VOTING (Debate & select who is Glitch)
// 5. RESULT (Win/Loss)

const GRID_SIZE = 8;
const FIX_TARGET = 15; // Number of systems Admins need to fix to win
const SABOTAGE_TARGET = 8; // Number of systems Glitch needs to corrupt to win

export default function TheGlitch() {
  const multiplayerData = useMultiplayer('the-glitch');
  const { 
    isOnline, status, players, localPlayerId, isHost, 
    startLocalPlay, broadcastState, networkState, disconnect 
  } = multiplayerData;

  // Local Component State
  const [gameState, setGameState] = useState({
    phase: 'LOBBY', // LOBBY, ASSIGNMENT, PLAYING, VOTING, RESULT
    roles: {}, // playerId -> { isGlitch: bool }
    grid: Array(GRID_SIZE * GRID_SIZE).fill('system_ok'), // system_ok, fixing, corrupted
    scores: { fixed: 0, corrupted: 0 },
    votes: {}, // playerId -> votedForId
    timer: 0,
    winner: null // 'ADMINS', 'GLITCH'
  });

  // Handle incoming network state (Slave to Host)
  useEffect(() => {
    if (isOnline && !isHost && networkState) {
      setGameState(networkState);
    }
  }, [networkState, isOnline, isHost]);

  // Handle local state broadcasting (Host only)
  useEffect(() => {
    if (isOnline && isHost && status === 'connected' && gameState.phase !== 'LOBBY') {
      broadcastState(gameState);
    }
  }, [gameState, isOnline, isHost, status, broadcastState]);

  // --- HOST ACTIONS ---
  const handleStartGameLocal = (playerCount, activePlayers) => {
    // Determine Roles
    const selectedPlayers = activePlayers.slice(0, playerCount);
    const glitchIndex = Math.floor(Math.random() * selectedPlayers.length);
    
    const roles = {};
    selectedPlayers.forEach((p, i) => {
      roles[p.id] = { isGlitch: i === glitchIndex };
    });

    const initialState = {
      phase: 'ASSIGNMENT',
      roles,
      grid: Array(GRID_SIZE * GRID_SIZE).fill('system_ok'),
      scores: { fixed: 0, corrupted: 0 },
      votes: {},
      timer: 5,
      winner: null
    };

    setGameState(initialState);
    if (isOnline) broadcastState(initialState);

    // Assignment Phase Timer
    let t = 5;
    const interval = setInterval(() => {
      t -= 1;
      setGameState(prev => {
        const next = { ...prev, timer: t };
        if (t <= 0) {
          clearInterval(interval);
          next.phase = 'PLAYING';
          next.timer = 60; // 60s for gameplay
          startGameplayTimer();
        }
        if (isOnline && isHost) broadcastState(next);
        return next;
      });
    }, 1000);
  };

  let gameTimerInterval = null;
  const startGameplayTimer = () => {
    gameTimerInterval = setInterval(() => {
      setGameState(prev => {
        if (prev.phase !== 'PLAYING') {
          clearInterval(gameTimerInterval);
          return prev;
        }
        const next = { ...prev, timer: prev.timer - 1 };
        
        // Random system degradation (Host logic)
        if (isHost && Math.random() < 0.3) {
           const emptyIdxs = next.grid.map((c, i) => c === 'system_ok' ? i : -1).filter(i => i !== -1);
           if(emptyIdxs.length > 0){
             const target = emptyIdxs[Math.floor(Math.random() * emptyIdxs.length)];
             const newGrid = [...next.grid];
             newGrid[target] = 'warning';
             next.grid = newGrid;
           }
        }

        if (next.timer <= 0) {
          clearInterval(gameTimerInterval);
          next.phase = 'VOTING';
          next.timer = 30; // 30s to vote
          startVotingTimer();
        }
        if (isOnline && isHost) broadcastState(next);
        return next;
      });
    }, 1000);
  };

  const startVotingTimer = () => {
    const vtInterval = setInterval(() => {
      setGameState(prev => {
        if (prev.phase !== 'VOTING') {
          clearInterval(vtInterval);
          return prev;
        }
        const next = { ...prev, timer: prev.timer - 1 };
        if (next.timer <= 0) {
          clearInterval(vtInterval);
          next.phase = 'RESULT';
          
          // Tally votes
          const tallies = {};
          Object.values(next.votes).forEach(vId => {
            tallies[vId] = (tallies[vId] || 0) + 1;
          });
          
          let maxVotes = 0;
          let ejectedId = null;
          Object.entries(tallies).forEach(([id, count]) => {
            if (count > maxVotes) { maxVotes = count; ejectedId = id; }
          });

          // Check Win Condition
          if (ejectedId && next.roles[ejectedId]?.isGlitch) {
            next.winner = 'ADMINS';
          } else {
            next.winner = 'GLITCH';
          }
        }
        if (isOnline && isHost) broadcastState(next);
        return next;
      });
    }, 1000);
  };

  // --- PLAYER ACTIONS ---
  const handleCellClick = (index) => {
    if (gameState.phase !== 'PLAYING') return;

    // Local vs Online Input Handling
    // If online AND not host, we need a way to send commands to host. 
    // Supabase Broadcasts are bidirectional! Clients can broadcast 'player_action'.
    
    // For now, in a simplified model, any player can mutate state and broadcast it if playing locally,
    // but online, we need the host to arbitrate. Since building a full authoritative server model in React is complex,
    // we'll allow optimistic client updates for speed, OR just let the host handle it if we receive a request.
    
    // Simple approach: Any client updates the grid and broadcasts the new state. (Trust clients for this mini-game)
    setGameState(prev => {
      const isGlitch = Object.keys(prev.roles).length > 0 ? prev.roles[localPlayerId]?.isGlitch : false;
      
      const newGrid = [...prev.grid];
      const newScores = { ...prev.scores };
      let updated = false;

      if (isGlitch) {
        // Glitch actions: Corrupt active warnings
        if (newGrid[index] === 'warning') {
          newGrid[index] = 'corrupted';
          newScores.corrupted += 1;
          updated = true;
        }
      } else {
        // Admin actions: Fix warnings
        if (newGrid[index] === 'warning') {
          newGrid[index] = 'fixed';
          newScores.fixed += 1;
          updated = true;
        }
      }

      if (updated) {
        const next = { ...prev, grid: newGrid, scores: newScores };
        if (newScores.corrupted >= SABOTAGE_TARGET) {
          next.phase = 'RESULT';
          next.winner = 'GLITCH';
        } else if (newScores.fixed >= FIX_TARGET) {
          next.phase = 'RESULT';
          next.winner = 'ADMINS';
        }
        if (isOnline) broadcastState(next); // Any client can broadcast this state update in our simple model
        return next;
      }
      return prev;
    });
  };

  const handleVote = (targetPlayerId) => {
    if (gameState.phase !== 'VOTING') return;
    setGameState(prev => {
      const next = { ...prev, votes: { ...prev.votes, [localPlayerId]: targetPlayerId } };
      if (isOnline) broadcastState(next);
      return next;
    });
  };

  const resetToLobby = () => {
    setGameState({
      phase: 'LOBBY', roles: {}, grid: [], scores: { fixed: 0, corrupted: 0 },
      votes: {}, timer: 0, winner: null
    });
    if (isOnline && isHost) {
      broadcastState({ phase: 'LOBBY' });
    }
  };

  const [decodingText, setDecodingText] = useState('');

  // Decoding effect for assignment phase
  useEffect(() => {
    if (gameState.phase === 'ASSIGNMENT' && gameState.timer >= 3) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
      const interval = setInterval(() => {
        let res = '';
        for(let i=0; i<15; i++) res += chars[Math.floor(Math.random() * chars.length)];
        setDecodingText(res);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gameState.phase, gameState.timer]);

  // --- RENDERING ---
  if (gameState.phase === 'LOBBY' || status !== 'connected') {
    return (
      <div className="glitch-container">
        <MultiplayerLobby 
          gameTitle="THE GLITCH"
          maxPlayers={5}
          onStartLocal={handleStartGameLocal}
          hookData={multiplayerData}
        />
        <div className="protocol-briefing">
          <h4>// SYSTEM PROTOCOL BRIEFING</h4>
          <ul>
            <li><strong>ADMINS:</strong> Monitor the grid. When a cell flashes yellow (!), click it to SECURE the system. Reach {FIX_TARGET} fixes to win.</li>
            <li><strong>THE GLITCH:</strong> Hide among admins. When a cell flashes yellow (!), click it to CORRUPT the system. Reach {SABOTAGE_TARGET} corruptions to win.</li>
            <li><strong>VOTING:</strong> If the timer runs out, you must VOTE for the suspected Glitch. If the Glitch is ejected, Admins win.</li>
          </ul>
        </div>
      </div>
    );
  }

  // Active Game Render
  const myRole = gameState.roles[localPlayerId];
  const isGlitch = myRole?.isGlitch;

  return (
    <div className="glitch-container">
      <div className="glitch-header">
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>PHASE: <span className="highlight">{gameState.phase}</span></div>
          <div>TIME: <span className={gameState.timer <= 10 ? 'danger' : ''}>{gameState.timer}s</span></div>
        </div>
        <button onClick={disconnect} className="danger-text">DISCONNECT</button>
      </div>

      {gameState.phase === 'ASSIGNMENT' && (
        <div className="glitch-overlay">
          <h2>SYSTEM ANALYZING IDENTITY...</h2>
          <div className="decoding-text">{decodingText}</div>
          {gameState.timer < 3 && (
            <div className={`role-card ${isGlitch ? 'glitch-role' : 'admin-role'}`}>
              <h3>YOU ARE {isGlitch ? 'THE GLITCH' : 'AN ADMIN'}</h3>
              <p>{isGlitch 
                ? 'Sabotage systems undetected. If admins fix them, you lose.' 
                : 'Fix failing systems. Find the Glitch before it\'s too late.'}</p>
            </div>
          )}
        </div>
      )}

      {gameState.phase === 'PLAYING' && (
        <div className="glitch-gameplay">
          <div className="score-board">
            <div className="admin-score">SYSTEMS SECURED: {gameState.scores.fixed}/{FIX_TARGET}</div>
            <div className="glitch-score">SYSTEMS CORRUPTED: {gameState.scores.corrupted}/{SABOTAGE_TARGET}</div>
          </div>
          
          <div className="grid-container">
            {gameState.grid.map((cellState, i) => (
              <div 
                key={i} 
                className={`grid-cell ${cellState} ${isGlitch ? 'is-glitch' : ''}`}
                onClick={() => handleCellClick(i)}
              />
            ))}
          </div>
        </div>
      )}

      {gameState.phase === 'VOTING' && (
        <div className="glitch-overlay voting-phase">
          <h2>EMERGENCY MEETING</h2>
          <p>Trace the source of corruption. Vote now.</p>
          <div className="voting-list">
            {players.map(p => {
              const hasVotedMe = Object.values(gameState.votes).filter(v => v === p.id).length;
              return (
                <button 
                  key={p.id}
                  className={`vote-btn ${gameState.votes[localPlayerId] === p.id ? 'selected' : ''}`}
                  onClick={() => handleVote(p.id)}
                >
                  <span style={{ color: p.color }}>●</span> Player {p.id.substring(0,6)}
                  <span className="vote-count">{hasVotedMe > 0 && `(${hasVotedMe})`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState.phase === 'RESULT' && (
        <div className="glitch-overlay result-phase">
          <h1 className={gameState.winner === 'GLITCH' ? 'glitch-win' : 'admin-win'}>
            {gameState.winner === 'GLITCH' ? 'SYSTEM CORRUPTED' : 'SYSTEM SECURED'}
          </h1>
          <p>
            {gameState.winner === 'GLITCH' 
              ? 'The Glitch has successfully derailed the servers.' 
              : 'The Admins successfully identified and compiled the Glitch.'}
          </p>
          <p className="reveal-text">
            IDENTIFIED GLITCH: <span style={{ color: '#ff00ff' }}>
              PLAYER {Object.keys(gameState.roles).find(k => gameState.roles[k].isGlitch)?.toUpperCase().substring(0,6)}
            </span>
          </p>
          {isHost && <button className="action-btn" onClick={resetToLobby}>REBOOT SYSTEM</button>}
          {!isHost && <p style={{marginTop: '20px'}}>Waiting for host...</p>}
        </div>
      )}
    </div>
  );
}
