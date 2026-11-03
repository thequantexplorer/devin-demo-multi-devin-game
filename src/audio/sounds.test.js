import { describe, expect, it, vi } from 'vitest';
import { createSounds } from './sounds.js';

function param(log) {
  return {
    value: 0,
    setValueAtTime: (v, t) => log.push(['set', v, t]),
    exponentialRampToValueAtTime: (v, t) => log.push(['exp', v, t]),
    linearRampToValueAtTime: (v, t) => log.push(['lin', v, t]),
  };
}

function makeFakeContext({ state = 'running' } = {}) {
  const instances = [];
  class FakeAudioContext {
    constructor() {
      this.state = state;
      this.currentTime = 10;
      this.destination = { kind: 'destination' };
      this.oscillators = [];
      this.gains = [];
      this.resume = vi.fn(() => {
        this.state = 'running';
        return Promise.resolve();
      });
      instances.push(this);
    }
    createOscillator() {
      const log = [];
      const osc = {
        type: 'sine',
        frequency: param(log),
        log,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      this.oscillators.push(osc);
      return osc;
    }
    createGain() {
      const log = [];
      const gain = { gain: param(log), log, connect: vi.fn() };
      this.gains.push(gain);
      return gain;
    }
  }
  return { FakeAudioContext, instances };
}

const NAMES = ['pickup', 'hit', 'win', 'lose'];

describe('createSounds without Web Audio', () => {
  it('is a silent no-op in node', () => {
    const sounds = createSounds();
    expect(() => sounds.unlock()).not.toThrow();
    for (const name of [...NAMES, 'nope', undefined]) expect(() => sounds.play(name)).not.toThrow();
  });

  it('is a no-op when AudioContextClass is null', () => {
    const sounds = createSounds({ AudioContextClass: null });
    expect(() => sounds.play('pickup')).not.toThrow();
  });

  it('never throws when the constructor fails', () => {
    const Broken = vi.fn(function Broken() {
      throw new Error('no audio');
    });
    const sounds = createSounds({ AudioContextClass: Broken });
    expect(() => sounds.unlock()).not.toThrow();
    expect(() => sounds.play('hit')).not.toThrow();
    expect(Broken).toHaveBeenCalledTimes(1);
  });
});

describe('createSounds with Web Audio', () => {
  it('creates the context lazily, once', () => {
    const { FakeAudioContext, instances } = makeFakeContext();
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    expect(instances).toHaveLength(0);
    sounds.unlock();
    expect(instances).toHaveLength(1);
    sounds.play('pickup');
    sounds.unlock();
    expect(instances).toHaveLength(1);
  });

  it('creates the context on first play too', () => {
    const { FakeAudioContext, instances } = makeFakeContext();
    createSounds({ AudioContextClass: FakeAudioContext }).play('win');
    expect(instances).toHaveLength(1);
  });

  it('resumes a suspended context', () => {
    const { FakeAudioContext, instances } = makeFakeContext({ state: 'suspended' });
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    sounds.unlock();
    expect(instances[0].resume).toHaveBeenCalledTimes(1);
    sounds.play('hit');
    expect(instances[0].resume).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected resume', async () => {
    const { FakeAudioContext, instances } = makeFakeContext({ state: 'suspended' });
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    sounds.unlock();
    instances[0].state = 'suspended';
    instances[0].resume = vi.fn(() => Promise.reject(new Error('blocked')));
    expect(() => sounds.play('pickup')).not.toThrow();
    await Promise.resolve();
  });

  it.each(NAMES)('plays %s with oscillators under 1 s, routed through the master gain', (name) => {
    const { FakeAudioContext, instances } = makeFakeContext();
    createSounds({ AudioContextClass: FakeAudioContext }).play(name);
    const ctx = instances[0];
    const [master, ...noteGains] = ctx.gains;
    expect(master.connect).toHaveBeenCalledWith(ctx.destination);
    expect(ctx.oscillators.length).toBeGreaterThan(0);
    expect(noteGains).toHaveLength(ctx.oscillators.length);
    ctx.oscillators.forEach((osc, i) => {
      expect(osc.connect).toHaveBeenCalledWith(noteGains[i]);
      expect(noteGains[i].connect).toHaveBeenCalledWith(master);
      const start = osc.start.mock.calls[0][0];
      const stop = osc.stop.mock.calls[0][0];
      expect(start).toBeGreaterThanOrEqual(ctx.currentTime);
      expect(stop).toBeGreaterThan(start);
      expect(stop - ctx.currentTime).toBeLessThan(1);
      // gain envelope rises from near-silence and ends near-silence
      const env = noteGains[i].log;
      expect(env[0][1]).toBeLessThan(0.01);
      expect(env.at(-1)[1]).toBeLessThan(0.01);
    });
  });

  it('pickup rises in pitch and hit is low and falling', () => {
    const { FakeAudioContext, instances } = makeFakeContext();
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    sounds.play('pickup');
    const pickup = instances[0].oscillators.map((o) => o.log.map((e) => e[1]));
    pickup.forEach((f) => expect(f.at(-1)).toBeGreaterThan(f[0]));
    instances[0].oscillators.length = 0;
    sounds.play('hit');
    const hit = instances[0].oscillators.map((o) => o.log.map((e) => e[1]));
    hit.forEach((f) => {
      expect(f[0]).toBeLessThan(300);
      expect(f.at(-1)).toBeLessThan(f[0]);
    });
  });

  it('win rises and lose falls note by note', () => {
    const { FakeAudioContext, instances } = makeFakeContext();
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    const firstFreqs = () => instances[0].oscillators.map((o) => o.log[0][1]);
    sounds.play('win');
    const win = firstFreqs();
    for (let i = 1; i < win.length; i++) expect(win[i]).toBeGreaterThan(win[i - 1]);
    instances[0].oscillators.length = 0;
    sounds.play('lose');
    const lose = firstFreqs();
    for (let i = 1; i < lose.length; i++) expect(lose[i]).toBeLessThan(lose[i - 1]);
  });

  it('ignores unknown names without creating a context', () => {
    const { FakeAudioContext, instances } = makeFakeContext();
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    sounds.play('explode');
    sounds.play('toString');
    expect(instances).toHaveLength(0);
    sounds.unlock();
    sounds.play('explode');
    expect(instances[0].oscillators).toHaveLength(0);
  });

  it('never throws when node creation fails mid-play', () => {
    const { FakeAudioContext } = makeFakeContext();
    FakeAudioContext.prototype.createOscillator = () => {
      throw new Error('boom');
    };
    const sounds = createSounds({ AudioContextClass: FakeAudioContext });
    expect(() => sounds.play('win')).not.toThrow();
  });
});
