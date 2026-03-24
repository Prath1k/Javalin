import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

export function useMultiplayer(gameId) {
  const [isOnline, setIsOnline] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [status, setStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  const [errorMsg, setErrorMsg] = useState('');
  
  const [players, setPlayers] = useState([]);
  const [localPlayerId, setLocalPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(true); // Default to host for local play
  
  // Last networked state received
  const [networkState, setNetworkState] = useState(null);

  const channelRef = useRef(null);

  // Helper to get a random neon color
  const getRandomColor = () => {
    const colors = ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF3D00'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const cleanupChannel = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const connectToRoom = useCallback(async (code, asHost = false) => {
    await cleanupChannel();
    setStatus('connecting');
    setErrorMsg('');
    setIsOnline(true);
    setRoomCode(code);
    setIsHost(asHost);

    const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    setLocalPlayerId(playerId);

    const channel = supabase.channel(`game_${gameId}_${code}`, {
      config: {
        presence: { key: playerId },
        broadcast: { ack: false, self: false }
      }
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePlayers = [];
        let hostFound = false;
        
        // Convert presence state into a flat array of players sorted by join time
        Object.keys(state).forEach(key => {
          const presences = state[key];
          // Usually just 1 presence per key
          if (presences.length > 0) {
            const p = presences[0];
            activePlayers.push(p);
            if (p.isHost) hostFound = true;
          }
        });
        
        // Sort by joinedAt so order is consistent
        activePlayers.sort((a, b) => a.joinedAt - b.joinedAt);
        setPlayers(activePlayers);
        
        // If host left, and we are online, maybe we should close the room, but let's just log it
        if (!hostFound && activePlayers.length > 0) {
          console.warn('Host has left the room.');
        }
      })
      .on('broadcast', { event: 'game_state' }, (payload) => {
        setNetworkState(payload.payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected');
          // Track our own presence
          await channel.track({
            id: playerId,
            color: getRandomColor(),
            isHost: asHost,
            joinedAt: Date.now()
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setStatus('error');
          setErrorMsg('Failed to connect to room. Check your connection or Supabase settings.');
          setIsOnline(false);
        }
      });
  }, [gameId, cleanupChannel]);

  const createRoom = useCallback(() => {
    const code = generateRoomCode();
    connectToRoom(code, true);
  }, [connectToRoom]);

  const joinRoom = useCallback((code) => {
    if (!code || code.length < 4) {
      setErrorMsg('Invalid room code.');
      return;
    }
    connectToRoom(code.toUpperCase(), false);
  }, [connectToRoom]);

  const startLocalPlay = useCallback((numPlayers = 2) => {
    cleanupChannel();
    setIsOnline(false);
    setStatus('connected');
    setIsHost(true);
    setRoomCode('LOCAL');
    
    const localPlayers = Array.from({ length: numPlayers }, (_, i) => ({
      id: `local_${i}`,
      color: getRandomColor(),
      isHost: i === 0,
      joinedAt: Date.now() + i
    }));
    
    setPlayers(localPlayers);
    setLocalPlayerId(localPlayers[0].id);
  }, [cleanupChannel]);

  const broadcastState = useCallback((stateData) => {
    if (!isOnline || !channelRef.current || status !== 'connected') return;
    
    // Only the host usually broadcasts authoritative state, but we allow any for flexibility
    channelRef.current.send({
      type: 'broadcast',
      event: 'game_state',
      payload: stateData
    }).catch(err => console.error('Broadcast error:', err));
  }, [isOnline, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, [cleanupChannel]);

  return {
    isOnline,
    roomCode,
    status,
    errorMsg,
    players,
    localPlayerId,
    isHost,
    networkState,
    createRoom,
    joinRoom,
    startLocalPlay,
    broadcastState,
    disconnect: cleanupChannel
  };
}
