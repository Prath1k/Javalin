import React, { useState, useEffect, useRef } from 'react';
import './BottleSpin.css';

const BottleSpin = () => {
  const [hasMicAccess, setHasMicAccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rotation, setRotation] = useState(0);
  const [rpm, setRpm] = useState(0);

  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const physicsFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const lastRotRef = useRef(0);

  // Drag refs
  const isDragging = useRef(false);
  const dragStartAngle = useRef(0);
  const dragLastAngle = useRef(0);
  const dragLastTime = useRef(0);
  const surfaceRef = useRef(null);

  const FRICTION = 0.985;
  const BLOW_SENSITIVITY = 0.5;
  const BLOW_THRESHOLD = 35;
  const MAX_VELOCITY = 60;

  const getAngleFromCenter = (clientX, clientY) => {
    const rect = surfaceRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const handleDragStart = (e) => {
    if (!surfaceRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    isDragging.current = true;
    dragStartAngle.current = getAngleFromCenter(clientX, clientY);
    dragLastAngle.current = dragStartAngle.current;
    dragLastTime.current = performance.now();
  };

  const handleDragMove = (e) => {
    if (!isDragging.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentAngle = getAngleFromCenter(clientX, clientY);
    let delta = currentAngle - dragLastAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    rotationRef.current += delta;
    setRotation(rotationRef.current);
    const now = performance.now();
    const dt = now - dragLastTime.current;
    if (dt > 0) velocityRef.current = delta / (dt / 16);
    dragLastAngle.current = currentAngle;
    dragLastTime.current = now;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.smoothingTimeConstant = 0.5;
      analyser.fftSize = 256;
      microphone.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      setHasMicAccess(true);
      setIsListening(true);
      setErrorMsg('');
      monitorAudio();
    } catch (err) {
      setErrorMsg('Microphone access denied. You can still drag or click to spin!');
      console.error(err);
    }
  };

  const stopMicrophone = () => {
    if (microphoneRef.current) microphoneRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsListening(false);
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    let sum = 0;
    const length = Math.min(dataArray.length, 30);
    for (let i = 0; i < length; i++) sum += dataArray[i];
    const averageVolume = sum / length;
    if (averageVolume > BLOW_THRESHOLD) {
      const addedVelocity = (averageVolume - BLOW_THRESHOLD) * BLOW_SENSITIVITY;
      velocityRef.current = Math.min(velocityRef.current + addedVelocity, MAX_VELOCITY);
    }
    animationFrameRef.current = requestAnimationFrame(monitorAudio);
  };

  const updatePhysics = () => {
    if (!isDragging.current) {
      velocityRef.current *= FRICTION;
      if (Math.abs(velocityRef.current) < 0.1) velocityRef.current = 0;
      if (velocityRef.current !== 0) {
        rotationRef.current += velocityRef.current;
        setRotation(rotationRef.current);
      }
    }
    // Calculate RPM
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 100) {
      const dRot = Math.abs(rotationRef.current - lastRotRef.current);
      const rpmVal = (dRot / 360) * (60000 / dt);
      setRpm(Math.round(rpmVal));
      lastTimeRef.current = now;
      lastRotRef.current = rotationRef.current;
    }
    physicsFrameRef.current = requestAnimationFrame(updatePhysics);
  };

  useEffect(() => {
    physicsFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      stopMicrophone();
      if (physicsFrameRef.current) cancelAnimationFrame(physicsFrameRef.current);
    };
  }, []);

  const triggerManualSpin = () => {
    if (isDragging.current) return;
    velocityRef.current = Math.min(velocityRef.current + 30 + Math.random() * 20, MAX_VELOCITY);
  };

  const speedLevel = Math.min(1, Math.abs(velocityRef.current) / MAX_VELOCITY);
  const ringColor = `hsl(${160 - speedLevel * 120}, 80%, 55%)`;

  return (
    <div className="game-container bottle-spin-container">
      <div className="game-header">
        <h2 className="game-title">Bottle Spin & Blow</h2>
        <p className="game-desc">
          Blow into your mic, drag to spin, or click the bottle!
        </p>
      </div>

      <div className="game-controls">
        {!hasMicAccess ? (
          <button className="btn-primary pulse-btn" onClick={startMicrophone}>
            🎙️ Allow Microphone to Play
          </button>
        ) : (
          <div className="mic-status">
            <span className="status-dot green"></span>
            Microphone Active — Start Blowing!
          </div>
        )}
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
      </div>

      <div className="play-area">
        <div
          className="surface"
          ref={surfaceRef}
          onClick={triggerManualSpin}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Speed ring */}
          <div
            className="speed-ring"
            style={{
              borderColor: ringColor,
              boxShadow: `0 0 ${20 + speedLevel * 40}px ${ringColor}, inset 0 0 ${10 + speedLevel * 20}px ${ringColor}`,
              opacity: 0.3 + speedLevel * 0.7,
              transform: `scale(${1 + speedLevel * 0.08})`
            }}
          />

          <div
            className="bottle"
            style={{ transform: `translate(-50%, -60%) rotate(${rotation}deg)` }}
          >
            <div className="bottle-neck">
              <div className="bottle-cap"></div>
              <div className="bottle-highlight"></div>
            </div>
            <div className="bottle-body">
              <div className="bottle-label">
                <div className="label-text">SPIN</div>
              </div>
              <div className="bottle-highlight-body"></div>
            </div>
          </div>

          <div className="shadow" style={{ opacity: Math.min(1, speedLevel + 0.3) }}></div>
        </div>

        {/* RPM Gauge */}
        <div className="rpm-gauge">
          <span className="rpm-value">{rpm}</span>
          <span className="rpm-label">RPM</span>
        </div>

        <div className="manual-hint">
          Drag to spin • Click for quick spin • Blow into mic
        </div>
      </div>
    </div>
  );
};

export default BottleSpin;
