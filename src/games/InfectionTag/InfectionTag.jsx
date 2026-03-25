import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import GameScene from './GameScene';
import './InfectionTag.css';

export default function InfectionTag() {
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('Connecting to Server...');

  useEffect(() => {
    if (!containerRef.current) return;

    const handleStatus = (e) => setServerStatus(e.detail);
    window.addEventListener('infection-status', handleStatus);

    let game;
    // Create a slight delay to allow React StrictMode's immediate unmount 
    // to cancel the boot before Phaser locks the WebGL context
    const bootTimer = setTimeout(() => {
      const config = {
        type: Phaser.AUTO,
        width: 1000,
        height: 700,
        parent: containerRef.current,
        backgroundColor: '#111122',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: [GameScene]
      };
      game = new Phaser.Game(config);
      gameRef.current = game;
    }, 50);

    return () => {
      clearTimeout(bootTimer);
      window.removeEventListener('infection-status', handleStatus);
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="infection-container">
      <div className="infection-header">
        <div className={`status-indicator ${serverStatus.includes('Connected') ? 'online' : 'offline'}`}>
          {serverStatus}
        </div>
        <div className="infection-rules">
          AVOID THE GLOWING PLAYERS [W,A,S,D]
        </div>
      </div>
      <div ref={containerRef} className="phaser-container" />
      
      {/* Mobile D-Pad */}
      <div className="infection-mobile-controls">
        <div className="dpad-grid">
          <div /> 
          <button 
            className="dpad-btn up"
            onPointerDown={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'up', active: true } }))}
            onPointerUp={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'up', active: false } }))}
          >
            <span className="material-symbols-outlined">keyboard_arrow_up</span>
          </button>
          <div />
          
          <button 
            className="dpad-btn left"
            onPointerDown={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'left', active: true } }))}
            onPointerUp={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'left', active: false } }))}
          >
            <span className="material-symbols-outlined">keyboard_arrow_left</span>
          </button>
          <div className="dpad-center" />
          <button 
            className="dpad-btn right"
            onPointerDown={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'right', active: true } }))}
            onPointerUp={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'right', active: false } }))}
          >
            <span className="material-symbols-outlined">keyboard_arrow_right</span>
          </button>
          
          <div />
          <button 
            className="dpad-btn down"
            onPointerDown={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'down', active: true } }))}
            onPointerUp={() => window.dispatchEvent(new CustomEvent('mobile-move', { detail: { dir: 'down', active: false } }))}
          >
            <span className="material-symbols-outlined">keyboard_arrow_down</span>
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
