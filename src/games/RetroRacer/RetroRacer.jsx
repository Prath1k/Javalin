import React, { useRef, useEffect, useState } from 'react';
import Phaser from 'phaser';
import './RetroRacer.css';

// --- GAME CONSTANTS ---
const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const CAMERA_HEIGHT = 1000;
const DRAW_DISTANCE = 300;
const CAMERA_DEPTH = 0.84;
const BASE_MAX_SPEED = SEGMENT_LENGTH / (1/60);
const NITRO_SPEED = BASE_MAX_SPEED * 1.5;
const ACCEL = BASE_MAX_SPEED / 5;
const BREAKING = -BASE_MAX_SPEED;
const DECEL = -BASE_MAX_SPEED / 5;
const OFF_ROAD_DECEL = -BASE_MAX_SPEED / 2;
const OFF_ROAD_LIMIT = BASE_MAX_SPEED / 4;
const CENTRIFUGAL = 0.3;

const COLORS = {
  SKY: '#0b0c10',
  TREE: '#ff007f', // Base tree trunk color
  FOG: '#0b0c10',
  LIGHT: { road: 0x1a1a24, grass: 0x0b0c10, rumble: 0x00ffff, lane: 0xff00ff },
  DARK: { road: 0x11111a, grass: 0x1a1a24, rumble: 0xff00ff, lane: null },
  FINISH: { road: 0x000000, grass: 0x000000, rumble: 0x000000, lane: 0x000000 }
};

const TRAFFIC_COLORS = [0xffff00, 0xff00ff, 0x00ffcc, 0xff3300, 0x0033ff];

const easeIn = (a, b, percent) => a + (b-a)*Math.pow(percent,2);
const easeOut = (a, b, percent) => a + (b-a)*(1-Math.pow(1-percent,2));
const easeInOut = (a, b, percent) => a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const percentRemaining = (n, total) => (n % total) / total;
const interpolate = (a, b, percent) => a + (b-a)*percent;

class RetroRacerScene extends Phaser.Scene {
    constructor() {
        super('RetroRacerScene');
    }

    create() {
        this.graphics = this.add.graphics();
        this.engine = {
            position: 0,
            speed: 0,
            maxSpeed: BASE_MAX_SPEED,
            nitro: 100, // 0 to 100
            isBoosting: false,
            playerX: 0,
            playerZ: CAMERA_HEIGHT * CAMERA_DEPTH,
            segments: [],
            trackLength: 0,
            cars: [],
            score: 0,
            timeElapsed: 0
        };

        this.bridge = this.registry.get('bridge');
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
        this.gameState = 'START';
        
        this.events.on('START_GAME', this.startGame, this);
        this.events.on('UPDATE_INPUT', this.updateMobileInput, this);
        this.mobileInput = { left: false, right: false, up: false, down: false, nitro: false };

        this.buildTrack();
        this.renderFrame();
    }
    
    updateMobileInput(inputData) {
        this.mobileInput = { ...this.mobileInput, ...inputData };
    }

    addSegment(curve, y) {
        const n = this.engine.segments.length;
        
        // Procedural scenery logic
        let sprites = [];
        if (Math.random() > 0.9) {
            sprites.push({ source: 'palm', offset: -1.5 - Math.random() });
        }
        if (Math.random() > 0.9) {
            sprites.push({ source: 'pyramid', offset: 1.5 + Math.random() });
        }
        if (n % 20 === 0) {
            sprites.push({ source: 'sign', offset: -1.2 });
        }

        this.engine.segments.push({
            index: n,
            p1: { world: { y: this.getLastY(), z:  n * SEGMENT_LENGTH }, camera: {}, screen: {} },
            p2: { world: { y: y, z: (n+1)*SEGMENT_LENGTH }, camera: {}, screen: {} },
            curve: curve,
            cars: [],
            sprites: sprites,
            color: Math.floor(n/RUMBLE_LENGTH)%2 ? COLORS.DARK : COLORS.LIGHT
        });
    }

    getLastY() {
        const segments = this.engine.segments;
        return (segments.length === 0) ? 0 : segments[segments.length-1].p2.world.y;
    }

    addRoad(enter, hold, leave, curve, y) {
        const startY = this.getLastY();
        const endY = startY + (Math.trunc(y) || 0) * SEGMENT_LENGTH;
        const n = enter + hold + leave;
        for(let i = 0; i < enter; i++) this.addSegment(easeIn(0, curve, i/enter), easeInOut(startY, endY, i/n));
        for(let i = 0; i < hold;  i++) this.addSegment(curve, easeInOut(startY, endY, (enter+i)/n));
        for(let i = 0; i < leave; i++) this.addSegment(easeInOut(curve, 0, i/leave), easeInOut(startY, endY, (enter+hold+i)/n));
    }
    
    addStraight(num) { this.addRoad(num, num, num, 0, 0); }
    addCurve(num, curve, height) { this.addRoad(num, num, num, curve, height); }
    addSCurves() {
        this.addRoad(25, 25, 25, -2, 0);
        this.addRoad(25, 25, 25,  3, 0);
        this.addRoad(25, 25, 25,  1, 0);
        this.addRoad(25, 25, 25, -3, 0);
    }

    buildTrack() {
        this.engine.segments = [];
        this.addStraight(20);
        for(let i=0; i<10; i++) {
            this.addCurve(20, randomChoice([2, -2, 3, -3, 4, -4]), randomChoice([0, 10, -10, 20, -20]));
            this.addStraight(randomChoice([10, 20, 30]));
            if(i%3===0) this.addSCurves();
        }
        this.addSegment(0, 0);
        this.engine.segments[this.engine.segments.length-1].color = COLORS.FINISH;
        this.addStraight(10);
        this.engine.trackLength = this.engine.segments.length * SEGMENT_LENGTH;
    }

    findSegment(z) {
        return this.engine.segments[Math.floor(z / SEGMENT_LENGTH) % this.engine.segments.length] || this.engine.segments[0];
    }

    resetCars() {
        this.engine.cars = [];
        const segments = this.engine.segments;
        for(let i = 0; i < 60; i++) {
            let segmentIndex = randomInt(50, segments.length - 50);
            let offset = (Math.random() * randomChoice([-0.8, 0.8]));
            let speed = (BASE_MAX_SPEED / 4) + (Math.random() * BASE_MAX_SPEED / 2);
            let color = randomChoice(TRAFFIC_COLORS);
            let car = { offset, speed, color, z: segmentIndex * SEGMENT_LENGTH, percent: 0 };
            this.engine.cars.push(car);
            segments[segmentIndex].cars.push(car);
        }
    }

    startGame() {
        this.buildTrack();
        this.resetCars();
        this.engine.position = 0;
        this.engine.speed = 0;
        this.engine.nitro = 100;
        this.engine.isBoosting = false;
        this.engine.playerX = 0;
        this.engine.score = 0;
        this.engine.timeElapsed = 0;
        this.gameState = 'PLAYING';
    }

    project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;
        
        const z = Math.max(1, p.camera.z); // Prevent Division by zero or negative depth
        p.screen.scale = cameraDepth / z;
        p.screen.x = Math.round((width / 2)  + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    }

    drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color, alpha = 1) {
        if (color === null) return;
        this.graphics.fillStyle(color, alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.lineTo(x3, y3);
        this.graphics.lineTo(x4, y4);
        this.graphics.closePath();
        this.graphics.fillPath();
    }

    drawSegment(width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {
        const r1 = w1 / Math.max(6, 2 * lanes);
        const r2 = w2 / Math.max(6, 2 * lanes);
        const l1 = w1 / Math.max(32, 8 * lanes);
        const l2 = w2 / Math.max(32, 8 * lanes);
        
        this.graphics.fillStyle(color.grass, 1);
        this.graphics.fillRect(0, y2, width, y1 - y2);
        
        // Ground grid effect
        if (y2 < y1 && color.grass !== 0x000000) {
            this.graphics.lineStyle(2, 0xff00ff, 0.2);
            this.graphics.beginPath();
            this.graphics.moveTo(0, y1);
            this.graphics.lineTo(width, y1);
            this.graphics.strokePath();
        }

        this.drawPolygon(x1-w1-r1, y1, x1-w1, y1, x2-w2, y2, x2-w2-r2, y2, color.rumble); // Left Rumble
        this.drawPolygon(x1+w1+r1, y1, x1+w1, y1, x2+w2, y2, x2+w2+r2, y2, color.rumble); // Right Rumble
        this.drawPolygon(x1-w1,    y1, x1+w1, y1, x2+w2, y2, x2-w2,    y2, color.road);   // Road

        if (color.lane !== null) {
            const lanew1 = w1*2/lanes;
            const lanew2 = w2*2/lanes;
            let lanex1 = x1 - w1 + lanew1;
            let lanex2 = x2 - w2 + lanew2;
            for(let lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++) {
                this.drawPolygon(lanex1 - l1/2, y1, lanex1 + l1/2, y1, lanex2 + l2/2, y2, lanex2 - l2/2, y2, color.lane);
            }
        }
        
        if (fog < 1) {
            this.drawPolygon(0, y1, width, y1, width, y2, 0, y2, 0x0b0c10, 1 - fog);
        }
    }

    drawScenery(sprite, scale, destX, destY) {
        const type = sprite.source;
        if (type === 'palm') {
            const h = 200 * scale;
            const w = 50 * scale;
            this.drawPolygon(destX-w/4, destY, destX-w/8, destY-h, destX+w/8, destY-h, destX+w/4, destY, 0x550055);
            this.graphics.fillStyle(0x00ffff, 1); // neon leaves
            this.graphics.beginPath();
            this.graphics.moveTo(destX, destY-h);
            this.graphics.lineTo(destX-w, destY-h+w);
            this.graphics.lineTo(destX, destY-h-w);
            this.graphics.lineTo(destX+w, destY-h+w);
            this.graphics.fillPath();
        } else if (type === 'pyramid') {
            const w = 300 * scale;
            const h = 150 * scale;
            this.drawPolygon(destX-w/2, destY, destX, destY-h, destX, destY-h, destX+w/2, destY, 0xff00ff);
            // wireframe
            this.graphics.lineStyle(2, 0x00ffff, 1);
            this.graphics.strokeTriangle(destX-w/2, destY, destX, destY-h, destX+w/2, destY);
        } else if (type === 'sign') {
            const w = 100 * scale;
            const h = 100 * scale;
            this.graphics.fillStyle(0x333333, 1);
            this.graphics.fillRect(destX-w*0.1, destY-h, w*0.2, h); // post
            this.graphics.fillStyle(0xff00ff, 1);
            this.graphics.fillRect(destX-w/2, destY-h*1.5, w, h*0.5); // billboard
            this.graphics.lineStyle(2, 0x00ffff, 1);
            this.graphics.strokeRect(destX-w/2, destY-h*1.5, w, h*0.5);
        }
    }

    drawSprite(width, height, resolution, roadWidth, scale, destX, destY, color, steer) {
        const cw = 80 * scale; 
        const ch = 40 * scale; 
        const cx = destX;
        const cy = destY;
        
        // Shadow
        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillEllipse(cx, cy, cw*1.2, ch*0.5);

        // Traffic Car body
        this.graphics.fillStyle(color || 0xffcc00, 1);
        this.graphics.fillRect(cx - cw/2, cy - ch, cw, ch);
        
        // Roof
        this.graphics.fillStyle(0x111111, 1);
        this.graphics.fillRect(cx - cw*0.3, cy - ch*1.5, cw*0.6, ch*0.5);

        // Tires
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillRect(cx - cw/2 - 5*scale, cy - 10*scale, 10*scale, 20*scale);
        this.graphics.fillRect(cx + cw/2 - 5*scale, cy - 10*scale, 10*scale, 20*scale);
        
        // Tail lights
        this.graphics.fillStyle(0xff0000, 1);
        this.graphics.fillRect(cx - cw*0.4, cy - ch*0.4, 15*scale, 5*scale);
        this.graphics.fillRect(cx + cw*0.4 - 15*scale, cy - ch*0.4, 15*scale, 5*scale);
    }

    drawPlayer(width, height, resolution, roadWidth, speedPercent, scale, destX, destY, steer, isAccelerating, isBoosting) {
        let bounce = (1.5 * Math.random() * speedPercent * resolution) * randomChoice([-1, 1]);
        if (isBoosting) bounce *= 2;
        const cw = 120 * scale;
        const ch = 40 * scale;
        const cx = destX;
        const cy = destY - ch/2 + bounce;

        // Shadow under car
        this.graphics.fillStyle(0x000000, 0.6);
        this.graphics.fillEllipse(cx, destY + bounce, cw*1.2, ch*0.6);

        // Dynamic body color
        this.graphics.fillStyle(0x00ffff, 1); // Bright cyan
        this.graphics.fillRect(cx - cw/2, cy - ch, cw, ch);
        this.graphics.lineStyle(2, 0xff00ff, 1); // magenta trim
        this.graphics.strokeRect(cx - cw/2, cy - ch, cw, ch);
        
        // Roof
        this.graphics.fillStyle(0x111111, 1);
        this.graphics.fillRect(cx - cw*0.3, cy - ch*1.8, cw*0.6, ch*0.8);

        // Tires
        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillRect(cx - cw/2 - 10*scale, cy, 20*scale, 20*scale);
        this.graphics.fillRect(cx + cw/2 - 10*scale, cy, 20*scale, 20*scale);

        // Tail lights
        const isBraking = this.cursors.down.isDown || this.keys.S.isDown || this.mobileInput.down;
        this.graphics.fillStyle(isBraking ? 0xff0000 : 0xcc0000, 1);
        this.graphics.fillRect(cx - cw/2 + 5*scale, cy - ch/2, 25*scale, 10*scale);
        this.graphics.fillRect(cx + cw/2 - 30*scale, cy - ch/2, 25*scale, 10*scale);

        // Exhaust Flames (Only if accelerating)
        if (isAccelerating && speedPercent > 0.1) {
            const fx = cx - cw/2 + 10*scale;
            const fx2 = cx + cw/2 - 20*scale;
            const fy = cy + 5*scale;
            
            this.graphics.fillStyle(isBoosting ? 0x00ccff : 0xffaa00, Math.random() * 0.5 + 0.5); // blue if boosting, orange if normal
            const flameLen = isBoosting ? 60*scale : 30 * scale * Math.random();
            // Left exahust
            this.drawPolygon(fx, fy, fx+10*scale, fy, fx+5*scale, fy + flameLen, fx+5*scale, fy + flameLen, isBoosting ? 0x00ccff : 0xffaa00);
            // Right exhaust
            this.drawPolygon(fx2, fy, fx2+10*scale, fy, fx2+5*scale, fy + flameLen, fx2+5*scale, fy + flameLen, isBoosting ? 0x00ccff : 0xffaa00);
        }
    }

    updateLogic(dt) {
        const state = this.engine;
        state.timeElapsed += dt;

        const playerSegment = this.findSegment(state.position + state.playerZ);
        const speedPercent  = state.speed / state.maxSpeed;
        let dx = dt * 2 * speedPercent;
        
        state.position = state.position + (dt * state.speed);
        
        if (state.position > state.trackLength) {
            state.position -= state.trackLength;
        }
        
        state.playerX = state.playerX - (dx * speedPercent * playerSegment.curve * CENTRIFUGAL);

        // Inputs
        const isUp = this.cursors.up.isDown || this.keys.W.isDown || this.mobileInput.up;
        const isDown = this.cursors.down.isDown || this.keys.S.isDown || this.mobileInput.down;
        const isLeft = this.cursors.left.isDown || this.keys.A.isDown || this.mobileInput.left;
        const isRight = this.cursors.right.isDown || this.keys.D.isDown || this.mobileInput.right;
        const isSpace = this.keys.SPACE.isDown || this.mobileInput.nitro;

        // Nitro Logic
        if (isSpace && state.nitro > 0 && isUp) {
            state.isBoosting = true;
            state.nitro -= 20 * dt; // drain nitro
            state.maxSpeed = NITRO_SPEED;
        } else {
            state.isBoosting = false;
            state.maxSpeed = BASE_MAX_SPEED;
            if (state.nitro < 100) {
                state.nitro += 5 * dt; // recharge nitro slowly
            }
        }
        state.nitro = Math.max(0, Math.min(100, state.nitro));

        if (isUp) {
            state.speed = state.speed + ((state.isBoosting ? ACCEL * 2 : ACCEL) * dt);
        } else if (isDown) {
            state.speed = state.speed + (BREAKING * dt);
        } else {
            state.speed = state.speed + (DECEL * dt);
        }
        
        if (isLeft && (state.speed > 0)) {
            state.playerX = state.playerX - dx;
        } else if (isRight && (state.speed > 0)) {
            state.playerX = state.playerX + dx;
        }
        
        state.playerX = Math.max(-2, Math.min(2, state.playerX));
        
        if (((state.playerX < -1) || (state.playerX > 1)) && (state.speed > OFF_ROAD_LIMIT)) {
            state.speed = state.speed + (OFF_ROAD_DECEL * dt);
        }
        
        state.speed = Math.max(0, Math.min(state.maxSpeed, state.speed));

        // Score Syncing via Bridge
        if (state.speed > 0) {
            state.score += (state.speed * dt * 0.1);
        }
        if (this.bridge) {
            let spdDisplay = Math.floor((state.speed / BASE_MAX_SPEED) * 160);
            let scDisplay = Math.floor(state.score);
            let ntrDisplay = Math.floor(state.nitro);
            this.bridge.updateHUD(scDisplay, spdDisplay, ntrDisplay, state.isBoosting);
        }

        // Traffic AI
        for(let i=0; i<state.cars.length; i++) {
            let car = state.cars[i];
            let oldSegment = this.findSegment(car.z);
            car.z = car.z + (dt * car.speed);
            
            if(car.z > state.trackLength) car.z -= state.trackLength;
            
            let newSegment = this.findSegment(car.z);
            if (oldSegment !== newSegment) {
                let index = oldSegment.cars.indexOf(car);
                if (index > -1) oldSegment.cars.splice(index, 1);
                newSegment.cars.push(car);
            }
        }

        // Collision logic
        if (state.speed > 0) {
            playerSegment.cars.forEach(car => {
                if (state.playerZ + state.position > car.z && state.playerZ + state.position - state.speed * dt < car.z) {
                    let w = 0.5;
                    if ((state.playerX > car.offset - w) && (state.playerX < car.offset + w)) {
                        state.speed = BASE_MAX_SPEED / 5;
                        if(state.playerX < car.offset) state.playerX -= 0.1;
                        else state.playerX += 0.1;
                        
                        // Penalty nitro drop on crash
                        state.nitro = Math.max(0, state.nitro - 20);
                    }
                }
            });
        }
    }

    renderFrame() {
        const state = this.engine;
        const width = this.sys.game.config.width;
        const height = this.sys.game.config.height;
        const resolution = height/480;

        this.graphics.clear();

        // Sky & Sun
        this.graphics.fillStyle(0xff0055, 1);
        this.graphics.beginPath();
        this.graphics.arc(width/2, height/2 - 50, 100, 0, 2*Math.PI);
        this.graphics.fillPath();

        this.graphics.fillStyle(0x0b0c10, 1);
        for(let i=0; i<6; i++) {
            this.graphics.fillRect(width/2 - 110, height/2 + 30 - (i*15), 220, i*2 + 2);
        }

        var baseSegment = this.findSegment(state.position);
        var basePercent = percentRemaining(state.position, SEGMENT_LENGTH);
        var playerSegment = this.findSegment(state.position + state.playerZ);
        var playerPercent = percentRemaining(state.position + state.playerZ, SEGMENT_LENGTH);
        var playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
        var dx = - (baseSegment.curve * basePercent);
        var x = 0;
        var maxY = height; // for clipping

        for (var n = 0; n < DRAW_DISTANCE; n++) {
            var segment = state.segments[(baseSegment.index + n) % state.segments.length];
            segment.looped = segment.index < baseSegment.index;
            segment.fog = Math.exp(-0.005 * n);
            segment.clip = maxY;

            this.project(segment.p1, (state.playerX * ROAD_WIDTH) - x,      playerY + CAMERA_HEIGHT, state.position - (segment.looped ? state.trackLength : 0), CAMERA_DEPTH, width, height, ROAD_WIDTH);
            this.project(segment.p2, (state.playerX * ROAD_WIDTH) - x - dx, playerY + CAMERA_HEIGHT, state.position - (segment.looped ? state.trackLength : 0), CAMERA_DEPTH, width, height, ROAD_WIDTH);

            x  = x + dx;
            dx = dx + segment.curve;

            if ((segment.p1.camera.z <= CAMERA_DEPTH) || 
                (segment.p2.screen.y >= segment.p1.screen.y) ||
                (segment.p2.screen.y >= maxY)) {
                continue;
            }

            this.drawSegment(width, 3,
                segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
                segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w,
                segment.fog, segment.color);

            maxY = segment.p1.screen.y; 
        }

        // Draw objects back to front
        for (n = DRAW_DISTANCE - 1; n > 0; n--) {
            segment = state.segments[(baseSegment.index + n) % state.segments.length];
            
            // Draw Scenery Sprites
            for (let i = 0; i < segment.sprites.length; i++) {
                let sprite = segment.sprites[i];
                let spriteScale = segment.p1.screen.scale;
                let spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * ROAD_WIDTH * width/2);
                let spriteY = segment.p1.screen.y;
                
                if (spriteY < segment.clip) {
                    this.drawScenery(sprite, spriteScale, spriteX, spriteY);
                }
            }

            // Draw Enemy Cars
            for (let i = 0; i < segment.cars.length; i++) {
                let car = segment.cars[i];
                let spriteScale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percentRemaining(car.z, SEGMENT_LENGTH));
                let spriteX = interpolate(segment.p1.screen.x, segment.p2.screen.x, percentRemaining(car.z, SEGMENT_LENGTH)) + (spriteScale * car.offset * ROAD_WIDTH * width/2);
                let spriteY = interpolate(segment.p1.screen.y, segment.p2.screen.y, percentRemaining(car.z, SEGMENT_LENGTH));
                
                if (spriteY < segment.clip) {
                    this.drawSprite(width, height, resolution, ROAD_WIDTH, spriteScale, spriteX, spriteY, car.color);
                }
            }
            
            if (segment === playerSegment) {
                const isLeft = this.cursors.left.isDown || this.keys.A.isDown || this.mobileInput.left;
                const isRight = this.cursors.right.isDown || this.keys.D.isDown || this.mobileInput.right;
                const isUp = this.cursors.up.isDown || this.keys.W.isDown || this.mobileInput.up;

                this.drawPlayer(width, height, resolution, ROAD_WIDTH,
                            (state.speed/state.maxSpeed),
                            CAMERA_DEPTH/state.playerZ,
                            width/2,
                            (height/2) - (CAMERA_DEPTH/state.playerZ * interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height/2),
                            state.speed * (isLeft ? -1 : isRight ? 1 : 0),
                            isUp,
                            state.isBoosting);
            }
        }
    }

    update(time, delta) {
        if (this.gameState !== 'PLAYING') {
            if (this.gameState === 'START' && this.engine.segments.length > 0) {
                 this.engine.playerX = 0;
                 this.engine.position = 0;
                 this.renderFrame();
            }
            return;
        }

        const dt = Math.min(1, delta / 1000);
        this.updateLogic(dt);
        this.renderFrame();
    }
}


const RetroRacer = () => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  
  const scoreRef = useRef(null);
  const speedRef = useRef(null);
  const speedBarRef = useRef(null);
  const nitroBarRef = useRef(null);

  const [gameState, setGameState] = useState('START');
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: 1024,
      height: 768,
      parent: containerRef.current,
      backgroundColor: '#0b0c10',
      scene: RetroRacerScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Setting up the bridge
    const bridge = {
      updateHUD: (score, speed, nitro, isBoosting) => {
        if (scoreRef.current) scoreRef.current.innerText = `SCORE: ${score.toString().padStart(6, '0')}`;
        if (speedRef.current) speedRef.current.innerText = speed.toString();
        
        if (speedBarRef.current) {
            let pct = Math.min(100, Math.max(0, (speed / 200) * 100));
            speedBarRef.current.style.width = `${pct}%`;
            if (pct >= 80) speedBarRef.current.classList.add('max');
            else speedBarRef.current.classList.remove('max');
        }

        if (nitroBarRef.current) {
            nitroBarRef.current.style.width = `${nitro}%`;
            if (nitro >= 99) nitroBarRef.current.classList.add('ready');
            else nitroBarRef.current.classList.remove('ready');
            
            if (isBoosting) nitroBarRef.current.style.filter = 'brightness(1.5)';
            else nitroBarRef.current.style.filter = 'none';
        }

        bridge.latestScore = score;
      },
      setGameOver: () => {
          setFinalScore(bridge.latestScore || 0);
          setGameState('GAMEOVER');
      }
    };
    game.registry.set('bridge', bridge);

    return () => {
      game.destroy(true);
    };
  }, []);

  const startGameFn = () => {
      setGameState('PLAYING');
      const scene = gameRef.current.scene.scenes[0];
      if (scene) {
          scene.events.emit('START_GAME');
      }
  };

  const handleMobileInput = (dir, val) => {
      const scene = gameRef.current?.scene.scenes[0];
      if (scene) {
          scene.events.emit('UPDATE_INPUT', { [dir]: val });
      }
  };

  return (
    <div className="retro-racer-container" style={{background: '#0b0c10'}}>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%' }}
        className="retro-racer-canvas"
      />
      
      {/* UI overlays */}
      <div className="retro-racer-ui">
        {gameState === 'PLAYING' && (
          <div className="hud-top">
            <div className="hud-score" ref={scoreRef}>SCORE: 000000</div>
            <div className="hud-dash">
               <div className="gauge-row">
                  <span className="gauge-label">SPEED</span>
                  <div className="gauge-bar-bg">
                      <div className="gauge-fill speed" ref={speedBarRef}></div>
                  </div>
                  <span style={{width: 50, textAlign:'right', textShadow: '0 0 5px #00ffff', color: '#00ffff'}}><span ref={speedRef}>0</span></span>
               </div>
               <div className="gauge-row">
                  <span className="gauge-label" style={{color:'#ff00ff'}}>NITRO</span>
                  <div className="gauge-bar-bg">
                      <div className="gauge-fill nitro" ref={nitroBarRef}></div>
                  </div>
                  <span style={{width: 50}}></span>
               </div>
            </div>
          </div>
        )}
        
        {/* Mobile touch controls */}
        {gameState === 'PLAYING' && (
            <div className="mobile-controls">
               <div className="d-pad">
                  <div className="control-btn" onTouchStart={(e) => { e.preventDefault(); handleMobileInput('left', true); }} onTouchEnd={(e) => { e.preventDefault(); handleMobileInput('left', false); }} onMouseDown={(e)=>{e.preventDefault(); handleMobileInput('left', true);}} onMouseUp={(e)=>{e.preventDefault(); handleMobileInput('left', false);}}>◁</div>
                  <div className="control-btn" onTouchStart={(e) => { e.preventDefault(); handleMobileInput('right', true); }} onTouchEnd={(e) => { e.preventDefault(); handleMobileInput('right', false); }} onMouseDown={(e)=>{e.preventDefault(); handleMobileInput('right', true);}} onMouseUp={(e)=>{e.preventDefault(); handleMobileInput('right', false);}}>▷</div>
               </div>
               <div className="action-buttons">
                  <div className="control-btn nitro-btn" onTouchStart={(e) => { e.preventDefault(); handleMobileInput('nitro', true); }} onTouchEnd={(e) => { e.preventDefault(); handleMobileInput('nitro', false); }} onMouseDown={(e)=>{e.preventDefault(); handleMobileInput('nitro', true);}} onMouseUp={(e)=>{e.preventDefault(); handleMobileInput('nitro', false);}}>N</div>
                  <div className="control-btn" onTouchStart={(e) => { e.preventDefault(); handleMobileInput('down', true); }} onTouchEnd={(e) => { e.preventDefault(); handleMobileInput('down', false); }} onMouseDown={(e)=>{e.preventDefault(); handleMobileInput('down', true);}} onMouseUp={(e)=>{e.preventDefault(); handleMobileInput('down', false);}}>B</div>
                  <div style={{borderColor: '#00ffff', color: '#00ffff', boxShadow: '0 0 15px rgba(0, 255, 255, 0.2) inset'}} className="control-btn" onTouchStart={(e) => { e.preventDefault(); handleMobileInput('up', true); }} onTouchEnd={(e) => { e.preventDefault(); handleMobileInput('up', false); }} onMouseDown={(e)=>{e.preventDefault(); handleMobileInput('up', true);}} onMouseUp={(e)=>{e.preventDefault(); handleMobileInput('up', false);}}>A</div>
               </div>
            </div>
        )}
      </div>

      {gameState === 'START' && (
        <div className="screen-overlay">
          <div className="title-wrapper">
             <h1 className="title-text">OUTWAVE</h1>
          </div>
          <button className="retro-btn" onClick={startGameFn}>INSERT COIN</button>
          
          <div className="instructions">
            <p>Controls:</p>
            <p><span className="key">W</span> / <span className="key">⬆</span> to Accelerate</p>
            <p><span className="key">A</span> / <span className="key">D</span> or <span className="key">⬅</span> / <span className="key">➡</span> to Steer</p>
            <p><span className="key">S</span> / <span className="key">⬇</span> to Brake</p>
            <p style={{color:'#ff00ff', fontWeight: 'bold', marginTop: 10}}><span className="key">SPACE</span> to Activate NITRO</p>
          </div>
        </div>
      )}
      
      {gameState === 'GAMEOVER' && (
        <div className="screen-overlay">
          <h2 className="game-over-text">CRASHED</h2>
          <div className="final-stats">
            FINAL SCORE
            <span className="highlight">{finalScore}</span>
          </div>
          <button className="retro-btn" onClick={startGameFn}>PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
};

export default RetroRacer;
