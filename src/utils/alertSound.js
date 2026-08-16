let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, { type = 'sine', volume = 0.2, delay = 0 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Play alert chime — only when UI language is Arabic */
export function playAlertSound(type = 'info', lang = 'ar') {
  if (lang !== 'ar') return;

  switch (type) {
    case 'error':
    case 'security':
      playTone(280, 0.18, { type: 'square', volume: 0.12 });
      playTone(220, 0.25, { type: 'square', volume: 0.1, delay: 0.16 });
      break;
    case 'success':
      playTone(523, 0.14, { volume: 0.18 });
      playTone(659, 0.14, { volume: 0.16, delay: 0.12 });
      playTone(784, 0.22, { volume: 0.14, delay: 0.24 });
      break;
    case 'warning':
      playTone(440, 0.12, { type: 'triangle', volume: 0.16 });
      playTone(440, 0.12, { type: 'triangle', volume: 0.16, delay: 0.18 });
      break;
    default:
      playTone(620, 0.1, { volume: 0.14 });
      playTone(740, 0.15, { volume: 0.12, delay: 0.1 });
      break;
  }
}

export function isArabicLang(lang) {
  return lang === 'ar' || document.documentElement?.lang === 'ar';
}
