import Phaser from 'phaser';
import { io } from 'socket.io-client';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.players = {}; // Store player sprites
    this.localPlayerId = null;
  }

  preload() {
    // Generate a simple circle texture for players if no image is available
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 16);
    g.generateTexture('playerSprite', 32, 32);
    g.destroy();
  }

  create() {
    // Basic setup
    this.cameras.main.setBackgroundColor('#050510');
    
    // Draw grid background
    this.add.grid(500, 350, 1000, 700, 50, 50, 0x0a0a2a, 1, 0x333344, 0.2);

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Connect to Node.js backend
    // Assuming backend is running locally on port 3001
    const serverUrl = 'http://localhost:3001';
    this.socket = io(serverUrl);

    this.socket.on('connect', () => {
      window.dispatchEvent(new CustomEvent('infection-status', { detail: 'Connected to Network' }));
    });

    this.socket.on('disconnect', () => {
      window.dispatchEvent(new CustomEvent('infection-status', { detail: 'Disconnected from Server' }));
    });

    // 1. Receive current players
    this.socket.on('currentPlayers', (serverPlayers) => {
      this.localPlayerId = this.socket.id;
      Object.values(serverPlayers).forEach(p => {
        this.addPlayer(p, p.id === this.localPlayerId);
      });
    });

    // 2. New player joined
    this.socket.on('newPlayer', (playerInfo) => {
      this.addPlayer(playerInfo, false);
    });

    // 3. Player disconnected
    this.socket.on('playerDisconnected', (playerId) => {
      if (this.players[playerId]) {
        this.players[playerId].destroy();
        delete this.players[playerId];
      }
    });

    // 4. State Update (Transforms and Infection Status)
    this.socket.on('stateUpdate', (serverPlayers) => {
      if (!this.players) return;
      
      Object.keys(serverPlayers).forEach(id => {
        const serverParams = serverPlayers[id];
        const isLocal = id === this.localPlayerId;
        
        if (this.players[id]) {
          const sprite = this.players[id];
          
          // Smoooth interpolation for remote players
          if (!isLocal) {
            this.tweens.add({
              targets: sprite,
              x: serverParams.x,
              y: serverParams.y,
              duration: 1000 / 30, // matches server tick rate
              ease: 'Linear'
            });
          }

          // Update Infection Visuals
          this.setPlayerAppearance(sprite, serverParams.isInfected, serverParams.color);
        } else {
          // Fallback if player wasn't added yet
          this.addPlayer(serverParams, isLocal);
        }
      });
    });

    // 5. Infection Event (For sound/shake effects)
    this.socket.on('playerInfected', (id) => {
      if (id === this.localPlayerId) {
        this.cameras.main.shake(300, 0.02);
        // Could play a sound here
      }
    });
  }

  addPlayer(info, isLocal) {
    if (this.players[info.id]) return;

    const sprite = this.physics.add.sprite(info.x, info.y, 'playerSprite');
    
    // Set physics bounds
    sprite.setCollideWorldBounds(true);
    
    this.players[info.id] = sprite;

    if (isLocal) {
      this.localPlayer = sprite;
    }

    this.setPlayerAppearance(sprite, info.isInfected, info.color);
  }

  setPlayerAppearance(sprite, isInfected, defaultColorHex) {
    if (isInfected) {
      sprite.setTint(0xff00ff);
      // Optional: Add glow using post-fx pipeline if Phaser 3.60+ is used
      if (sprite.preFX) {
        // Clear previous fx just in case to prevent stacking
        sprite.preFX.clear(); 
        sprite.preFX.addGlow(0xff00ff, 4, 1);
      }
    } else {
      sprite.setTint(parseInt(defaultColorHex.replace('#', '0x')));
      if (sprite.preFX) sprite.preFX.clear();
    }
  }

  update() {
    if (!this.localPlayer || !this.socket) return;

    const speed = 250;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    
    if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    this.localPlayer.setVelocity(dx * speed, dy * speed);

    // Only emit if moving, or if we need to sync a stop
    const x = this.localPlayer.x;
    const y = this.localPlayer.y;

    if (this.localPlayer.oldPosition && (
        x !== this.localPlayer.oldPosition.x ||
        y !== this.localPlayer.oldPosition.y
    )) {
      this.socket.emit('playerMovement', { x, y });
    }

    this.localPlayer.oldPosition = { x, y };
  }
}
