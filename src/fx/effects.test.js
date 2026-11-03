import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { BURST_DURATION, BURST_PARTICLES, COLORS, SHAKE_DURATION, SHAKE_STRENGTH } from '../config.js';
import { createEffects } from './effects.js';

const bursts = (scene) => scene.children.filter((c) => c.isPoints);

afterEach(() => vi.restoreAllMocks());

describe('createEffects bursts', () => {
  it('adds an additive particle burst at the position', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 2, y: 0.5, z: 3 }, COLORS.crystal);
    const [points] = bursts(scene);
    expect(points).toBeDefined();
    const pos = points.geometry.attributes.position;
    expect(pos.count).toBe(BURST_PARTICLES);
    for (let i = 0; i < pos.count; i++) {
      expect([pos.getX(i), pos.getY(i), pos.getZ(i)]).toEqual([2, 0.5, 3]);
    }
    const m = points.material;
    expect(m.blending).toBe(THREE.AdditiveBlending);
    expect(m.transparent).toBe(true);
    expect(m.depthWrite).toBe(false);
    expect(m.color.getHex()).toBe(COLORS.crystal);
    expect(m.opacity).toBe(1);
  });

  it('defaults the color and accepts other colors', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 0, y: 0, z: 0 });
    fx.burst({ x: 0, y: 0, z: 0 }, COLORS.guard);
    const [a, b] = bursts(scene);
    expect(a.material.color.getHex()).toBe(COLORS.crystal);
    expect(b.material.color.getHex()).toBe(COLORS.guard);
  });

  it('particles fly out, fall and fade', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 0, y: 1, z: 0 });
    const [points] = bursts(scene);
    const pos = points.geometry.attributes.position;
    fx.update(0.05);
    let spread = 0;
    for (let i = 0; i < pos.count; i++) spread += Math.hypot(pos.getX(i), pos.getZ(i));
    expect(spread).toBeGreaterThan(0);
    const early = points.material.opacity;
    expect(early).toBeLessThan(1);
    const avgY = () => {
      let s = 0;
      for (let i = 0; i < pos.count; i++) s += pos.getY(i);
      return s / pos.count;
    };
    const y1 = avgY();
    for (let t = 0; t < BURST_DURATION * 0.9; t += 0.05) fx.update(0.05);
    expect(points.material.opacity).toBeLessThan(early);
    // gravity eventually pulls them down from their peak
    const y2 = avgY();
    fx.update(0.01);
    expect(avgY()).toBeLessThan(y2 + 1e-6);
    expect(y1).toBeGreaterThan(1);
  });

  it('removes and disposes bursts after BURST_DURATION', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 0, y: 0, z: 0 });
    const [points] = bursts(scene);
    const geo = vi.spyOn(points.geometry, 'dispose');
    const mat = vi.spyOn(points.material, 'dispose');
    fx.update(BURST_DURATION * 0.5);
    expect(bursts(scene)).toHaveLength(1);
    fx.burst({ x: 1, y: 0, z: 0 });
    fx.update(BURST_DURATION * 0.5 + 0.001);
    expect(bursts(scene)).toHaveLength(1);
    expect(geo).toHaveBeenCalled();
    expect(mat).toHaveBeenCalled();
    fx.update(BURST_DURATION);
    expect(bursts(scene)).toHaveLength(0);
  });

  it('works on any Object3D parent', () => {
    const group = new THREE.Group();
    const fx = createEffects(group);
    fx.burst({ x: 0, y: 0, z: 0 });
    expect(group.children).toHaveLength(1);
  });

  it('ignores invalid dt', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 0, y: 0, z: 0 });
    fx.update(NaN);
    fx.update(-1);
    expect(bursts(scene)[0].material.opacity).toBe(1);
  });
});

describe('createEffects shake', () => {
  it('returns zero offset when not shaking', () => {
    const fx = createEffects(new THREE.Scene());
    expect(fx.update(0.016)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('shakes within the strength and decays to zero over the duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const fx = createEffects(new THREE.Scene());
    fx.shake();
    const a = fx.update(0.01);
    expect(Math.abs(a.x)).toBeGreaterThan(0);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(SHAKE_STRENGTH);
    expect(Math.abs(a.y)).toBeLessThanOrEqual(SHAKE_STRENGTH);
    expect(Math.abs(a.z)).toBeLessThanOrEqual(SHAKE_STRENGTH);
    const b = fx.update(SHAKE_DURATION * 0.5);
    expect(Math.abs(b.x)).toBeLessThan(Math.abs(a.x));
    const c = fx.update(SHAKE_DURATION);
    expect(c).toEqual({ x: 0, y: 0, z: 0 });
    expect(fx.update(0.01)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('accepts a custom strength and duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fx = createEffects(new THREE.Scene());
    fx.shake(1, 2);
    const a = fx.update(0.001);
    expect(a.x).toBeLessThan(-0.99);
    expect(fx.update(1).x).not.toBe(0);
    expect(fx.update(1.1)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('a new shake restarts the timer', () => {
    const fx = createEffects(new THREE.Scene());
    fx.shake();
    fx.update(SHAKE_DURATION * 0.9);
    fx.shake();
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(fx.update(SHAKE_DURATION * 0.2).x).toBeGreaterThan(0);
  });
});

describe('createEffects clear', () => {
  it('removes all particles and stops shaking', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    fx.burst({ x: 0, y: 0, z: 0 });
    fx.burst({ x: 1, y: 0, z: 1 });
    fx.shake();
    fx.clear();
    expect(bursts(scene)).toHaveLength(0);
    expect(fx.update(0.01)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
