const LAST_EVENT_AT = new Map();

const PATTERNS = {
  tap: 10,
  soft: 12,
  hit: 18,
  heavy: 30,
  success: [12, 22, 12],
  danger: [28, 18, 28],
  goal: [20, 28, 20],
  gameOver: [55, 30, 65],
};

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHaptic(pattern = 'tap', { key = 'global', cooldown = 0 } = {}) {
  if (!canVibrate()) return false;

  const now = Date.now();
  const previous = LAST_EVENT_AT.get(key) || 0;
  if (cooldown > 0 && now - previous < cooldown) {
    return false;
  }

  LAST_EVENT_AT.set(key, now);
  const vibratePattern = PATTERNS[pattern] || PATTERNS.tap;
  return navigator.vibrate(vibratePattern);
}
