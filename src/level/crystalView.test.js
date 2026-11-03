import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCrystalView } from './crystalView.js';
import { createCrystals } from './crystals.js';
import { COLORS, CRYSTAL_BOB_HEIGHT, CRYSTAL_HEIGHT, CRYSTAL_SPIN_SPEED } from '../config.js';

const positions = [
  { x: 2, y: 3 },
  { x: 7, y: 1 },
  { x: 4, y: 9 },
];

function build() {
  const scene = new THREE.Scene();
  const crystals = createCrystals(positions);
  const view = createCrystalView(scene, crystals);
  const holders = [];
  scene.traverse((o) => o.name === 'crystal' && holders.push(o));
  return { scene, view, holders };
}

describe('createCrystalView', () => {
  it('makes one glowing cyan octahedron with a cyan light per crystal', () => {
    const { holders } = build();
    expect(holders).toHaveLength(3);
    for (const h of holders) {
      const mesh = h.children.find((c) => c.isMesh);
      const light = h.children.find((c) => c.isPointLight);
      expect(mesh.geometry).toBeInstanceOf(THREE.OctahedronGeometry);
      expect(mesh.material.color.getHex()).toBe(COLORS.crystal);
      expect(mesh.material.emissive.getHex()).toBe(COLORS.crystal);
      expect(mesh.material.emissiveIntensity).toBeGreaterThan(1);
      expect(light.color.getHex()).toBe(COLORS.crystal);
      expect(h.visible).toBe(true);
    }
  });

  it('places crystals over their tiles at CRYSTAL_HEIGHT', () => {
    const { view } = build();
    positions.forEach((p, i) => {
      expect(view.positionOf(i)).toEqual({ x: p.x, y: CRYSTAL_HEIGHT, z: p.y });
    });
    expect(view.positionOf(99)).toBeNull();
  });

  it('spins and bobs within CRYSTAL_BOB_HEIGHT', () => {
    const { view, holders } = build();
    const mesh = holders[0].children.find((c) => c.isMesh);
    const r0 = mesh.rotation.y;
    view.update(0.5, 0.5);
    expect(mesh.rotation.y).toBeCloseTo(r0 + CRYSTAL_SPIN_SPEED * 0.5);
    const ys = new Set();
    for (let t = 0; t < 6; t += 0.1) {
      view.update(0.1, t);
      for (let i = 0; i < 3; i += 1) {
        const { y } = view.positionOf(i);
        expect(Math.abs(y - CRYSTAL_HEIGHT)).toBeLessThanOrEqual(CRYSTAL_BOB_HEIGHT + 1e-9);
        ys.add(y.toFixed(3));
      }
    }
    expect(ys.size).toBeGreaterThan(10);
    // positionOf follows the bob
    expect(view.positionOf(0).y).toBe(holders[0].position.y);
  });

  it('hide and reset toggle visibility', () => {
    const { view, holders } = build();
    view.hide(1);
    expect(holders.map((h) => h.visible)).toEqual([true, false, true]);
    view.hide(42);
    view.hide(0);
    expect(holders.map((h) => h.visible)).toEqual([false, false, true]);
    view.reset();
    expect(holders.every((h) => h.visible)).toBe(true);
  });

  it('starts already-collected crystals hidden', () => {
    const scene = new THREE.Scene();
    const crystals = createCrystals(positions);
    crystals[2].collected = true;
    createCrystalView(scene, crystals);
    const holders = [];
    scene.traverse((o) => o.name === 'crystal' && holders.push(o));
    expect(holders.map((h) => h.visible)).toEqual([true, true, false]);
  });

  it('handles no crystals', () => {
    const view = createCrystalView(new THREE.Scene(), []);
    expect(() => view.update(0.1, 1)).not.toThrow();
    expect(() => view.reset()).not.toThrow();
  });
});
