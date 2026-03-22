import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScores } from '../../ScoreContext';
import './RhythmClicker.css';

const RhythmClicker = () => {
  const { updateHighScore } = useScores();

  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [pulseScale, setPulseScale] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [rings, setRings] = useState([]);
  const [beatBars, setBeatBars] = useState(new Array(16).fill(0));

  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);
  const rhythmIntervalRef = useRef(null);
  const beatTimeRef = useRef(0);
  const ringIdRef = useRef(0);
  const analyserRef = useRef(null);
  const barAnimRef = useRef(null);

  const BPM = 120;
  const MSPB = 60000 / BPM;

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
    }
  };

  const playBeatSound = () => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtxRef.current.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain);
    if (analyserRef.current) gain.connect(analyserRef.current);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.1);
  };

  const playClickSound = (isHit) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.type = isHit ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(isHit ? 880 : 220, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.1);
  };

  const spawnRing = () => {
    const id = ringIdRef.current++;
    setRings(prev => [...prev, id]);
    setTimeout(() => setRings(prev => prev.filter(r => r !== id)), 800);
  };

  const updateBars = useCallback(() => {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const bars = [];
      const step = Math.floor(data.length / 16);
      for (let i = 0; i < 16; i++) {
        bars.push(data[i * step] / 255);
      }
      setBeatBars(bars);
    }
    barAnimRef.current = requestAnimationFrame(updateBars);
  }, []);

  const startGame = () => {
    initAudio();
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsPlaying(true);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(30);
    setFeedback('Get Ready!');
    beatTimeRef.current = Date.now() + 1000;

    rhythmIntervalRef.current = setInterval(() => {
      const now = Date.now();
      beatTimeRef.current = now + MSPB;
      setPulseScale(1.5);
      setTimeout(() => setPulseScale(1), 150);
      playBeatSound();
      spawnRing();
    }, MSPB);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    barAnimRef.current = requestAnimationFrame(updateBars);
  };

  const endGame = useCallback(() => {
    setIsPlaying(false);
    clearInterval(rhythmIntervalRef.current);
    clearInterval(timerRef.current);
    cancelAnimationFrame(barAnimRef.current);
    setFeedback('Time Up!');
    setPulseScale(1);
    setBeatBars(new Array(16).fill(0));
  }, []);

  useEffect(() => {
    if (!isPlaying && score > 0) {
      updateHighScore('rhythm-clicker', score);
    }
  }, [isPlaying, score, updateHighScore]);

  useEffect(() => {
    return () => {
      if (rhythmIntervalRef.current) clearInterval(rhythmIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (barAnimRef.current) cancelAnimationFrame(barAnimRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const handleClick = () => {
    if (!isPlaying) {
      startGame();
      return;
    }
    initAudio();
    const now = Date.now();
    const diff = Math.abs(now - beatTimeRef.current);

    if (diff < 100) {
      const newCombo = combo + 1;
      setScore(s => s + 100 + (newCombo * 10));
      setCombo(newCombo);
      if (newCombo > bestCombo) setBestCombo(newCombo);
      setFeedback('PERFECT');
      playClickSound(true);
      setPulseScale(1.8);
      setTimeout(() => setPulseScale(1), 100);
    } else if (diff < 200) {
      const newCombo = combo + 1;
      setScore(s => s + 50);
      setCombo(newCombo);
      if (newCombo > bestCombo) setBestCombo(newCombo);
      setFeedback('GOOD');
      playClickSound(true);
    } else {
      setCombo(0);
      setFeedback('MISS');
      playClickSound(false);
    }
  };

  const onFire = combo >= 10;

  return (
    <div className={`rhythm-container ${onFire ? 'on-fire' : ''}`}>
      <div className="rhythm-header">
        <div className="rhythm-stats">
          <div className="r-stat">
            <span className="label">SCORE</span>
            <span className="value">{score}</span>
          </div>
          <div className="r-stat">
            <span className="label">COMBO</span>
            <span className="value" style={{ color: combo > 5 ? '#a855f7' : '#f4f4f5' }}>
              x{combo}
            </span>
          </div>
          <div className="r-stat">
            <span className="label">BEST</span>
            <span className="value" style={{ color: '#facc15' }}>x{bestCombo}</span>
          </div>
          <div className="r-stat">
            <span className="label">TIME</span>
            <span className="value" style={{ color: timeLeft <= 5 ? '#ef4444' : '#f4f4f5' }}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      <div className="rhythm-play-area">
        {/* Beat visualizer bars */}
        <div className="beat-visualizer">
          {beatBars.map((h, i) => (
            <div
              key={i}
              className="beat-bar"
              style={{
                height: `${Math.max(4, h * 60)}px`,
                background: `hsl(${270 + i * 5}, 80%, ${50 + h * 20}%)`,
                boxShadow: h > 0.3 ? `0 0 ${h * 10}px hsl(${270 + i * 5}, 80%, 50%)` : 'none'
              }}
            />
          ))}
        </div>

        <div className="target-ring"></div>

        {/* Expanding pulse rings */}
        {rings.map(id => (
          <div key={id} className="expanding-ring" />
        ))}

        <div
          className={`rhythm-orb ${isPlaying ? 'active' : ''} ${onFire ? 'fire-orb' : ''}`}
          style={{ transform: `scale(${pulseScale})` }}
          onClick={handleClick}
        >
          {!isPlaying && <span className="orb-text">START</span>}
          {isPlaying && onFire && <span className="fire-emoji">🔥</span>}
        </div>

        {feedback && (
          <div key={Math.random()} className={`feedback-text ${feedback.toLowerCase()}`}>
            {feedback}
          </div>
        )}
      </div>

      <div className="rhythm-instructions">
        Tap the pulsing orb to the beat. <br/>
        Timing is everything. Hit 10x combo for fire mode!
      </div>
    </div>
  );
};

export default RhythmClicker;
