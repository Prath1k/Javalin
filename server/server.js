const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Allow connections from the Vite dev server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// --- GAME STATE ---
const GAME_TICK_RATE = 1000 / 30; // 30 FPS tick rate
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const PLAYER_SPEED = 250;
const INFECTION_RADIUS = 50;

let players = {};
// Store inputs for authoritative movement (simplified for now, mostly relying on client positions but validating)
// In a true authoritative server, clients send INPUTS, but for this demo, clients will send TARGET POSITIONS and server validates distance.

const spawnPoints = [
  { x: 100, y: 100 },
  { x: MAP_WIDTH - 100, y: 100 },
  { x: 100, y: MAP_HEIGHT - 100 },
  { x: MAP_WIDTH - 100, y: MAP_HEIGHT - 100 },
  { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }
];

io.on('connection', (socket) => {
  console.log(`[+] Player Connected: ${socket.id}`);

  // Assign spawn point
  const spawn = spawnPoints[Object.keys(players).length % spawnPoints.length];
  
  // Create player
  players[socket.id] = {
    id: socket.id,
    x: spawn.x,
    y: spawn.y,
    isInfected: false,
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
  };

  // If this is the first player, or randomly we want to infect someone
  if (Object.keys(players).length === 2 && !Object.values(players).some(p => p.isInfected)) {
    // Infect the first person secretly
    const firstId = Object.keys(players)[0];
    players[firstId].isInfected = true;
  }

  // Send current state to NEW player
  socket.emit('currentPlayers', players);

  // Broadcast new player to OTHERS
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Handle client movement updates
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      // Basic validation: ignore massive jumps
      const p = players[socket.id];
      const dx = movementData.x - p.x;
      const dy = movementData.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // If jump is reasonable (accounting for latency), accept it
      if (dist < PLAYER_SPEED) {
        p.x = movementData.x;
        p.y = movementData.y;
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Player Disconnected: ${socket.id}`);
    delete players[socket.id];
    
    // If we lost the infected player, and there are others, infect someone else
    const remaining = Object.values(players);
    if (remaining.length > 0 && !remaining.some(p => p.isInfected)) {
       const randomId = Object.keys(players)[Math.floor(Math.random() * remaining.length)];
       players[randomId].isInfected = true;
    }

    io.emit('playerDisconnected', socket.id);
  });
});

// --- SERVER GAME LOOP ---
setInterval(() => {
  const playerList = Object.values(players);
  let stateChanged = false;

  // Check for infection collisions
  for (let i = 0; i < playerList.length; i++) {
    const p1 = playerList[i];
    if (!p1.isInfected) continue;

    for (let j = 0; j < playerList.length; j++) {
      const p2 = playerList[j];
      if (p1.id === p2.id || p2.isInfected) continue;

      // Distance check
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < INFECTION_RADIUS) {
        // Tag!
        p2.isInfected = true;
        stateChanged = true;
        
        // Optional: Cure the tagger (Tag mode) or keep them infected (Zombie mode). 
        // Let's do Zombie Infection Mode: everyone becomes infected!
        io.emit('playerInfected', p2.id);
      }
    }
  }

  // Broadcast state 30 times a second
  io.emit('stateUpdate', players);

}, GAME_TICK_RATE);

server.listen(PORT, () => {
  console.log(`🚀 Infection Tag Server running on port ${PORT}`);
});
