import React, { useEffect, useMemo, useState } from 'react';
import { useScores } from '../../ScoreContext';
import './OrbChase.css';

const ROUND_SECONDS = 30;

function randomOrb() {
  return {
    x: Math.random() * 82 + 2,
    y: Math.random() * 76 + 4,
    size: Math.random() * 20 + 42,
  };
}

export default function OrbChase() {
  const { highScores, updateHighScore } = useScores();
  const highScore = highScores['orb-chase'] || 0;

  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [orb, setOrb] = useState(() => randomOrb());

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const moveEvery = Math.max(220, 720 - combo * 18);
    const mover = setInterval(() => {
      setOrb(randomOrb());
    }, moveEvery);
    return () => clearInterval(mover);
  }, [running, combo]);

  useEffect(() => {
    if (timeLeft === 0 && score > highScore) {
      updateHighScore('orb-chase', score);
    }
  }, [timeLeft, score, highScore, updateHighScore]);

  const accuracyHint = useMemo(() => {
    if (!running && timeLeft === 0) {
      if (score >= 90) return 'Legendary reflexes.';
      if (score >= 60) return 'Great run. You are quick.';
      if (score >= 35) return 'Solid speed. Keep pushing.';
      return 'Warm-up complete. Run it again.';
    }
    return 'Click the orb before it jumps.';
  }, [running, timeLeft, score]);

  const startRound = () => {
    setRunning(true);
    setTimeLeft(ROUND_SECONDS);
    setScore(0);
    setCombo(0);
    setOrb(randomOrb());
  };

  const hitOrb = () => {
    if (!running) return;
    const gain = 1 + Math.floor(combo / 6);
    setScore((prev) => prev + gain);
    setCombo((prev) => prev + 1);
    setOrb(randomOrb());
  };

  return (
    <div className="orb-chase-wrap">
      <div className="orb-chase-header">
        <h2>Orb Chase</h2>
        <p>1P reaction sprint</p>
      </div>

      <div className="orb-chase-hud">
        <div className="orb-chip">
          <span>Time</span>
          <strong>{timeLeft}s</strong>
        </div>
        <div className="orb-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="orb-chip">
          <span>Best</span>
          <strong>{highScore}</strong>
        </div>
        <div className="orb-chip">
          <span>Combo</span>
          <strong>x{Math.max(1, 1 + Math.floor(combo / 6))}</strong>
        </div>
      </div>

      <div className="orb-arena" role="application" aria-label="Orb chase arena">
        {running && (
          <button
            className="orb-target"
            onClick={hitOrb}
            style={{ left: `${orb.x}%`, top: `${orb.y}%`, width: orb.size, height: orb.size }}
            aria-label="Hit moving orb"
          />
        )}

        {!running && (
          <div className="orb-overlay">
            <h3>{timeLeft === 0 ? 'Round Over' : 'Ready'}</h3>
            <p>{accuracyHint}</p>
            <button className="orb-start" onClick={startRound}>
              {timeLeft === 0 ? 'Play Again' : 'Start Round'}
            </button>
          </div>
        )}
      </div>

      <p className="orb-help">Tip: combos increase point value, so stay on streak.</p>
    </div>
  );
}
