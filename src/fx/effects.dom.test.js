// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createEffects } from './effects.js';

describe('createEffects in jsdom (no 2D canvas context)', () => {
  it('falls back to plain-colored particles', () => {
    const scene = new THREE.Scene();
    const fx = createEffects(scene);
    expect(() => fx.burst({ x: 0, y: 0, z: 0 })).not.toThrow();
    const [points] = scene.children;
    expect(points.isPoints).toBe(true);
    expect(points.material.map).toBeNull();
  });
});
