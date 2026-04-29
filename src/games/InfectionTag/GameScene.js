import Phaser from 'phaser';
import { io } from 'socket.io-client';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.players = {}; // Store player sprites
    this.localPlayerId = null;
    this.mobileKeys = { up: false, down: false, left: false, right: false };
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

    // Mobile Dynamic Joystick listener
    let startPos = null;
    window.addEventListener('joystick-start', (e) => {
      startPos = e.detail;
      const visual = document.getElementById('infection-joystick-visual');
      if (visual) {
        visual.style.display = 'block';
        visual.style.left = `${startPos.x}px`;
        visual.style.top = `${startPos.y}px`;
      }
    });

    window.addEventListener('joystick-move', (e) => {
      if (!startPos) return;
      const dx = e.detail.x - startPos.x;
      const dy = e.detail.y - startPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      this.mobileKeys.up = dy < -20;
      this.mobileKeys.down = dy > 20;
      this.mobileKeys.left = dx < -20;
      this.mobileKeys.right = dx > 20;

      const thumb = document.querySelector('#infection-joystick-visual .joystick-thumb');
      if (thumb) {
        const moveX = Math.min(Math.max(dx, -40), 40);
        const moveY = Math.min(Math.max(dy, -40), 40);
        thumb.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    });

    window.addEventListener('joystick-end', () => {
      startPos = null;
      this.mobileKeys = { up: false, down: false, left: false, right: false };
      const visual = document.getElementById('infection-joystick-visual');
      if (visual) visual.style.display = 'none';
    });

    // Connect to Node.js backend
    // Use environment variable for production, fallback to localhost for dev
    const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
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
    this.socket.on('stateUpdate', (data) => {
      const serverPlayers = data.players || data;
      const orbs = data.powerOrbs || [];
      
      this.updateOrbs(orbs);

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

    this.socket.on('playerInfected', (id) => {
      if (id === this.localPlayerId) {
        this.cameras.main.shake(300, 0.02);
      }
    });

    this.socket.on('powerUp', (data) => {
      if (data.playerId === this.localPlayerId) {
         this.cameras.main.flash(500, 0, 255, 255);
         // Apply temporary speed boost locally for better feel
         this.speedBoost = 2;
         this.time.delayedCall(2000, () => this.speedBoost = 1);
      }
    });

    this.orbs = this.add.group();
    this.speedBoost = 1;
  }

  updateOrbs(serverOrbs) {
    this.orbs.clear(true, true);
    serverOrbs.forEach(o => {
      const orb = this.add.circle(o.x, o.y, 8, o.type === 'SPEED' ? 0x00ffff : 0xffaa00);
      this.orbs.add(orb);
      // Simple glow
      orb.setStrokeStyle(2, 0xffffff, 0.8);
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

    const speed = 250 * this.speedBoost;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.mobileKeys.left) dx = -1;
    else if (this.cursors.right.isDown || this.mobileKeys.right) dx = 1;
    
    if (this.cursors.up.isDown || this.mobileKeys.up) dy = -1;
    else if (this.cursors.down.isDown || this.mobileKeys.down) dy = 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    this.localPlayer.setVelocity(dx * speed, dy * speed);

    // Dynamic Camera Zoom
    const currentVel = Math.sqrt(this.localPlayer.body.velocity.x**2 + this.localPlayer.body.velocity.y**2);
    const targetZoom = 1 - (currentVel / 1000) * 0.2;
    this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.05);

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
