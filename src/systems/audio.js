// Audio system. See "HUD and audio" in docs/game-design.md.

export const SOUNDS = {
  pickup: { type: 'triangle', freq: 880, duration: 0.12 },
  hit: { type: 'sawtooth', freq: 140, duration: 0.3 },
  win: { type: 'sine', freq: 660, duration: 0.6 },
  lose: { type: 'square', freq: 110, duration: 0.6 },
};

/** Returns { play(name) }. Sounds are made with an oscillator, no audio files. */
export function createAudio(AudioContextClass) {
  throw new Error('Not implemented: createAudio');
}
