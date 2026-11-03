// Tiny synthesized sound effects (Web Audio oscillators + gain envelopes).
// Without Web Audio every call is a silent no-op.

const MASTER_VOLUME = 0.35;

// Each note: [startOffset s, duration s, waveform, startHz, endHz, peakGain]
const RECIPES = {
  pickup: [
    [0, 0.12, 'sine', 880, 1320, 0.5],
    [0.07, 0.22, 'triangle', 1320, 1760, 0.35],
  ],
  hit: [
    [0, 0.3, 'sine', 160, 50, 0.9],
    [0, 0.22, 'sawtooth', 110, 70, 0.25],
  ],
  win: [
    [0, 0.16, 'triangle', 523.25, 523.25, 0.45],
    [0.12, 0.16, 'triangle', 659.25, 659.25, 0.45],
    [0.24, 0.16, 'triangle', 783.99, 783.99, 0.45],
    [0.36, 0.45, 'sine', 1046.5, 1046.5, 0.5],
  ],
  lose: [
    [0, 0.24, 'triangle', 392, 370, 0.45],
    [0.22, 0.24, 'triangle', 311.13, 293.66, 0.45],
    [0.44, 0.5, 'sawtooth', 220, 110, 0.3],
  ],
};

function defaultAudioContextClass() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function playNote(ctx, destination, now, [offset, duration, type, from, to, peak]) {
  const start = now + offset;
  const end = start + duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.015, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

export function createSounds({ AudioContextClass } = {}) {
  const Ctor = AudioContextClass === undefined ? defaultAudioContextClass() : AudioContextClass;
  let ctx = null;
  let master = null;
  let failed = !Ctor;

  function ensure() {
    if (failed) return null;
    try {
      if (!ctx) {
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        const resumed = ctx.resume();
        if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
      }
      return ctx;
    } catch {
      failed = true;
      ctx = null;
      master = null;
      return null;
    }
  }

  function unlock() {
    ensure();
  }

  function play(name) {
    const recipe = Object.prototype.hasOwnProperty.call(RECIPES, name) ? RECIPES[name] : null;
    if (!recipe) return;
    const audio = ensure();
    if (!audio) return;
    try {
      const now = audio.currentTime || 0;
      for (const note of recipe) playNote(audio, master, now, note);
    } catch {
      // A broken audio backend must never break the game.
    }
  }

  return { unlock, play };
}
