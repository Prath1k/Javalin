import React, { useState } from 'react';
import './MultiplayerLobby.css';

export default function MultiplayerLobby({ gameTitle, maxPlayers, onStartLocal, hookData }) {
  const { 
    isOnline, roomCode, status, errorMsg, players, isHost, 
    createRoom, joinRoom, startLocalPlay, disconnect 
  } = hookData;

  const [joinCode, setJoinCode] = useState('');
  const [localPlayerCount, setLocalPlayerCount] = useState(2);

  // If connected (Local or Online matching phase)
  if (status === 'connected') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h1>{gameTitle}</h1>
          <div className="room-info">
            {isOnline ? (
              <>
                <h2>ONLINE ROOM: <span className="highlight-code">{roomCode}</span></h2>
                <p>Share this code with your friends!</p>
              </>
            ) : (
              <h2>LOCAL CO-OP</h2>
            )}
          </div>

          <div className="player-list">
            <h3>CONNECTED PLAYERS ({players.length}/{maxPlayers})</h3>
            <ul>
              {players.map((p, i) => (
                <li key={p.id} style={{ borderLeft: `4px solid ${p.color}` }}>
                  <span className="player-name">Player {i + 1} {p.isHost && '(HOST)'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lobby-actions">
            {isHost && (
              <button 
                className="action-btn success"
                disabled={players.length < 2 && maxPlayers > 1}
                onClick={() => onStartLocal(players.length, players)}
              >
                START GAME
              </button>
            )}
            {!isHost && (
              <div className="waiting-msg">Waiting for Host to start...</div>
            )}
            <button className="action-btn danger" onClick={disconnect}>
              LEAVE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-connection selection phase
  return (
    <div className="lobby-container">
      <div className="lobby-card phase-select">
        <h1>{gameTitle}</h1>
        <p className="subtitle">Select your game mode</p>
        
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <div className="mode-section">
          <h3>LOCAL MULTIPLAYER</h3>
          <p>Play together on the same device.</p>
          <div className="local-controls">
            <label>Players: </label>
            <input 
              type="number" 
              min="2" 
              max={maxPlayers} 
              value={localPlayerCount}
              onChange={(e) => setLocalPlayerCount(Math.min(maxPlayers, Math.max(2, parseInt(e.target.value) || 2)))}
            />
            <button className="action-btn" onClick={() => startLocalPlay(localPlayerCount)}>
              PLAY LOCAL
            </button>
          </div>
        </div>

        <div className="divider">OR</div>

        <div className="mode-section online-section">
          <h3>ONLINE MULTIPLAYER</h3>
          <p>Play globally using Supabase Realtime.</p>
          
          <button className="action-btn host-btn" onClick={createRoom} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'CONNECTING...' : 'HOST A GAME'}
          </button>
          
          <div className="join-controls">
            <input 
              type="text" 
              placeholder="ENTER ROOM CODE" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
            <button 
              className="action-btn" 
              onClick={() => joinRoom(joinCode)}
              disabled={joinCode.length < 4 || status === 'connecting'}
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
