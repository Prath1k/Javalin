// Simple Web Audio API synthesizer for UI sounds

let audioContext = null;

export const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

export const playHoverTick = (enabled = true) => {
  if (!enabled) return;
  initAudioContext();

  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.05);
};

export const playClick = (enabled = true) => {
  if (!enabled) return;
  initAudioContext();

  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.1);
};

export const playLaunchSweep = (enabled = true) => {
  if (!enabled) return;
  initAudioContext();

  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc.type = 'square';
  // Fast sweep down for a cyber/tech feel
  osc.frequency.setValueAtTime(600, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);

  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

  // Add some filter sweep for extra flavor
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc.start();
  osc.stop(audioContext.currentTime + 0.5);
};

export const hapticFeedback = (duration = 10, enabled = true) => {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    // Wrap in try-catch in case it's blocked by the browser policy
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // ignore
    }
  }
};
