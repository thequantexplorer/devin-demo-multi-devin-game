import { describe, it, expect, beforeEach } from 'vitest';
import { createAudio, SOUNDS } from '../src/systems/audio.js';

// A fake Web Audio API that records what the audio system does.
class FakeAudioContext {
  static instances = [];

  constructor() {
    FakeAudioContext.instances.push(this);
    this.currentTime = 10;
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.oscillators = [];
    this.resumed = 0;
  }

  resume() {
    this.resumed += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { value: 0, setValueAtTime(v) { this.value = v; } },
      connect(node) { osc.output = node; return node; },
      start(t) { osc.startedAt = t; },
      stop(t) { osc.stoppedAt = t; },
    };
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    const gain = {
      gain: {
        value: 1,
        setValueAtTime(v) { this.value = v; },
        linearRampToValueAtTime(v) { this.value = v; },
        exponentialRampToValueAtTime(v) { this.value = v; },
      },
      connect(node) { gain.output = node; return node; },
    };
    return gain;
  }
}

function reachesDestination(node, ctx) {
  for (let i = 0; node && i < 10; i += 1) {
    if (node === ctx.destination) return true;
    node = node.output;
  }
  return false;
}

beforeEach(() => {
  FakeAudioContext.instances = [];
});

describe('createAudio', () => {
  it('waits for the first sound before creating an AudioContext', () => {
    const audio = createAudio(FakeAudioContext);
    expect(FakeAudioContext.instances).toHaveLength(0);
    audio.play('pickup');
    audio.play('hit');
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('plays each sound with one oscillator, using the SOUNDS table', () => {
    const audio = createAudio(FakeAudioContext);
    for (const name of Object.keys(SOUNDS)) audio.play(name);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(4);
    Object.values(SOUNDS).forEach((sound, i) => {
      const osc = ctx.oscillators[i];
      expect(osc.type).toBe(sound.type);
      expect(osc.frequency.value).toBe(sound.freq);
      expect(osc.startedAt).toBe(10);
      expect(osc.stoppedAt).toBeCloseTo(10 + sound.duration);
      expect(reachesDestination(osc, ctx)).toBe(true);
    });
  });

  it('resumes a suspended context', () => {
    const audio = createAudio(FakeAudioContext);
    audio.play('pickup');
    const ctx = FakeAudioContext.instances[0];
    ctx.state = 'suspended';
    audio.play('win');
    expect(ctx.resumed).toBe(1);
  });

  it('throws on an unknown sound name', () => {
    expect(() => createAudio(FakeAudioContext).play('explode')).toThrow(/explode/);
  });

  it('does nothing when there is no Web Audio support', () => {
    expect(() => createAudio(undefined).play('pickup')).not.toThrow();
  });
});
