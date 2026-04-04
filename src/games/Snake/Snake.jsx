import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useScores } from '../../ScoreContext';
import { triggerHaptic } from '../../utils/haptics';
import './Snake.css';

const GRID_SIZE = 25;
const INITIAL_SPEED = 150;

const DIRECTION_MAP = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

const getRandomFoodPosition = (currentSnake) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // eslint-disable-next-line no-loop-func
    const isOnSnake = currentSnake.some(
      (segment) => segment.x === newFood.x && segment.y === newFood.y
    );
    if (!isOnSnake) break;
  }
  return newFood;
};

const Snake = () => {
  const [snake, setSnake] = useState([
    { x: 12, y: 12 },
    { x: 12, y: 13 },
    { x: 12, y: 14 },
  ]);
  const [food, setFood] = useState({ x: 8, y: 8 });
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['retro-snake'] || 0;
  
  const [particles, setParticles] = useState([]);
  const [shaking, setShaking] = useState(false);
  const [eatFlash, setEatFlash] = useState(false);

  const directionRef = useRef(direction);
  const lastProcessedDirectionRef = useRef(direction);
  const particleIdRef = useRef(0);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const spawnParticles = useCallback((x, y) => {
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: (x / GRID_SIZE) * 100 + 2.5,
        y: (y / GRID_SIZE) * 100 + 2.5,
        dx: (Math.random() - 0.5) * 4,
        dy: (Math.random() - 0.5) * 4,
        life: 1,
        color: ['#0ff', '#fff', '#facc15', '#22c55e'][Math.floor(Math.random() * 4)]
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 600);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (gameOver) return;
      if (e.key === ' ' || e.key === 'Escape') {
        setIsPaused((p) => !p);
        e.preventDefault();
        return;
      }
      const newDirection = DIRECTION_MAP[e.key];
      if (newDirection) {
        e.preventDefault();
        const currentDir = lastProcessedDirectionRef.current;
        if (newDirection.x !== 0 && currentDir.x !== 0 && newDirection.x === -currentDir.x) return;
        if (newDirection.y !== 0 && currentDir.y !== 0 && newDirection.y === -currentDir.y) return;
        setDirection(newDirection);
      }
    },
    [gameOver]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const gameLoop = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const currentDirection = directionRef.current;
      lastProcessedDirectionRef.current = currentDirection;

      const newHead = {
        x: head.x + currentDirection.x,
        y: head.y + currentDirection.y,
      };

      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE
      ) {
        handleGameOver();
        return prevSnake;
      }

      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        triggerHaptic('tap', { key: 'snake-food', cooldown: 45 });
        setFood(getRandomFoodPosition(newSnake));
        spawnParticles(newHead.x, newHead.y);
        setEatFlash(true);
        setTimeout(() => setEatFlash(false), 150);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, gameOver, isPaused, spawnParticles]);

  useEffect(() => {
    const speed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
    const intervalId = setInterval(gameLoop, speed);
    return () => clearInterval(intervalId);
  }, [gameLoop, score]);

  const handleGameOver = () => {
    triggerHaptic('gameOver', { key: 'snake-over', cooldown: 500 });
    setGameOver(true);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    if (score > highScore) {
      updateHighScore('retro-snake', score);
    }
  };

  const resetGame = () => {
    setSnake([
      { x: 12, y: 12 },
      { x: 12, y: 13 },
      { x: 12, y: 14 },
    ]);
    setDirection({ x: 0, y: -1 });
    lastProcessedDirectionRef.current = { x: 0, y: -1 };
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setParticles([]);
    setFood(getRandomFoodPosition([{ x: 12, y: 12 }, { x: 12, y: 13 }, { x: 12, y: 14 }]));
  };

  // Mobile Swipe Controls
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (gameOver) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        handleKeyDown({ key: dx > 0 ? 'ArrowRight' : 'ArrowLeft', preventDefault: () => {} });
      }
    } else {
      if (Math.abs(dy) > 30) {
        handleKeyDown({ key: dy > 0 ? 'ArrowDown' : 'ArrowUp', preventDefault: () => {} });
      }
    }
  };

  const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 50) * 10);
  const speedPercent = Math.round(((INITIAL_SPEED - currentSpeed) / (INITIAL_SPEED - 50)) * 100);

  return (
    <div className={`game-container snake-container ${shaking ? 'screen-shake' : ''}`}>
      <div className="snake-header">
        <h2 className="neon-title">RETRO NEON SNAKE</h2>
        <div className="score-board">
          <div className="score-box">
            <span className="label">SCORE</span>
            <span className={`value ${eatFlash ? 'score-pop' : ''}`}>{score}</span>
          </div>
          <div className="score-box highlight">
            <span className="label">HIGH SCORE</span>
            <span className="value">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Speed HUD */}
      <div className="speed-hud">
        <span className="speed-label">SPEED</span>
        <div className="speed-track">
          <div className="speed-fill" style={{ width: `${speedPercent}%` }} />
        </div>
        <span className="speed-val">{speedPercent}%</span>
      </div>

      <div
        className={`grid-container ${gameOver ? 'game-over-blur' : ''} ${eatFlash ? 'eat-flash' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="retro-grid-bg"></div>
        <div className="snake-active-area">
          {snake.map((segment, i) => {
            const isHead = i === 0;
            return (
              <div
                key={`snake-${i}`}
                className={`snake-part ${isHead ? 'snake-head' : 'snake-body'}`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${(1 / GRID_SIZE) * 100}%`,
                  height: `${(1 / GRID_SIZE) * 100}%`,
                  opacity: isHead ? 1 : 1 - (i / snake.length) * 0.5
                }}
              />
            );
          })}
          <div
            className="snake-food"
            style={{
              left: `${(food.x / GRID_SIZE) * 100}%`,
              top: `${(food.y / GRID_SIZE) * 100}%`,
              width: `${(1 / GRID_SIZE) * 100}%`,
              height: `${(1 / GRID_SIZE) * 100}%`
            }}
          />
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="snake-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: p.color,
              '--dx': `${p.dx * 20}px`,
              '--dy': `${p.dy * 20}px`,
            }}
          />
        ))}

        {gameOver && (
          <div className="game-over-overlay">
            <h3 className="game-over-text">SYSTEM FAILURE</h3>
            <p className="final-score">SCORE: {score}</p>
            {score >= highScore && score > 0 && <p className="new-record">🏆 NEW RECORD!</p>}
            <button className="btn-primary neon-btn" onClick={resetGame}>
              REBOOT SYSTEM
            </button>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="game-over-overlay">
            <h3 className="game-over-text blink">SYSTEM PAUSED</h3>
            <p className="final-score">Press Space to Resume</p>
          </div>
        )}
      </div>

      <div className="instructions">
        Use <span>WASD</span> or <span>Arrow Keys</span> to steer. Swipe on mobile. <span>Space</span> to pause.
      </div>
    </div>
  );
};

export default Snake;
