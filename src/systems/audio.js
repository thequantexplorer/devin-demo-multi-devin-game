// Audio system. See "HUD and audio" in docs/game-design.md.

export const SOUNDS = {
  pickup: { type: 'triangle', freq: 880, duration: 0.12 },
  hit: { type: 'sawtooth', freq: 140, duration: 0.3 },
  win: { type: 'sine', freq: 660, duration: 0.6 },
  lose: { type: 'square', freq: 110, duration: 0.6 },
};

const VOLUME = 0.2;
const SILENT = 0.0001;

/** Returns { play(name) }. Sounds are made with an oscillator, no audio files. */
export function createAudio(AudioContextClass) {
  let ctx = null;

  return {
    play(name) {
      const sound = SOUNDS[name];
      if (!sound) throw new Error(`Unknown sound: ${name}`);
      if (!AudioContextClass) return;

      if (!ctx) ctx = new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const end = now + sound.duration;

      const osc = ctx.createOscillator();
      osc.type = sound.type;
      osc.frequency.setValueAtTime(sound.freq, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(SILENT, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(end);
    },
  };
}
