import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createGuardView, headingFor } from './guardView.js';
import { createGuards, updateGuards } from './guards.js';
import { COLORS, tileToWorld } from '../config.js';

function setup() {
  const scene = new THREE.Scene();
  const guards = createGuards([
    { x: 4, y: 7, axis: 'x', min: 1, max: 9 },
    { x: 9, y: 5, axis: 'y', min: 3, max: 7 },
    { x: 2, y: 2, axis: 'x', min: 2, max: 2 },
  ]);
  const view = createGuardView(scene, guards);
  return { scene, guards, view };
}

const guardGroups = (view) => view.group.children;

describe('createGuardView', () => {
  it('adds one guard group per guard to the scene', () => {
    const { scene, view } = setup();
    expect(scene.children).toContain(view.group);
    expect(guardGroups(view)).toHaveLength(3);
    expect(typeof view.update).toBe('function');
  });

  it('builds a red-armored body, a helmet and a front visor', () => {
    const { view } = setup();
    for (const g of guardGroups(view)) {
      const body = g.getObjectByName('body');
      expect(body).toBeInstanceOf(THREE.Mesh);
      expect(body.material.color.getHex()).toBe(COLORS.guard);
      expect(body.castShadow).toBe(true);
      expect(g.getObjectByName('helmet')).toBeInstanceOf(THREE.Mesh);
      const visor = g.getObjectByName('visor');
      expect(visor.position.z).toBeGreaterThan(0); // front is local +z
      expect(visor.position.y).toBeGreaterThan(body.position.y);
    }
  });

  it('gives each guard an orange lantern point light', () => {
    const { view } = setup();
    for (const g of guardGroups(view)) {
      const lights = [];
      g.traverse((o) => o.isPointLight && lights.push(o));
      expect(lights).toHaveLength(1);
      expect(lights[0].color.getHex()).toBe(COLORS.lantern);
      expect(lights[0].intensity).toBeGreaterThan(0);
      expect(lights[0].distance).toBeGreaterThan(0);
      const glow = g.getObjectByName('lantern-glow');
      expect(glow.material.emissive.getHex()).toBe(COLORS.lantern);
    }
  });

  it('starts at the guard tile positions on the floor', () => {
    const { guards, view } = setup();
    guards.forEach((guard, i) => {
      const w = tileToWorld(guard.x, guard.y);
      const p = guardGroups(view)[i].position;
      expect(p.x).toBeCloseTo(w.x);
      expect(p.z).toBeCloseTo(w.z);
      expect(p.y).toBe(0);
    });
  });

  it('follows fractional guard positions on update', () => {
    const { guards, view } = setup();
    updateGuards(guards, 0.37);
    view.update(guards, 0.37, 0.37);
    guards.forEach((guard, i) => {
      const w = tileToWorld(guard.x, guard.y);
      expect(guardGroups(view)[i].position.x).toBeCloseTo(w.x);
      expect(guardGroups(view)[i].position.z).toBeCloseTo(w.z);
    });
  });
});

describe('facing', () => {
  it('maps dir along each axis to a heading', () => {
    expect(headingFor({ axis: 'x', dir: 1 })).toBeCloseTo(Math.PI / 2);
    expect(headingFor({ axis: 'x', dir: -1 })).toBeCloseTo(-Math.PI / 2);
    expect(headingFor({ axis: 'y', dir: 1 })).toBeCloseTo(0);
    expect(Math.abs(headingFor({ axis: 'y', dir: -1 }))).toBeCloseTo(Math.PI);
  });

  it('initially faces the walking direction', () => {
    const { view } = setup();
    const front = new THREE.Vector3(0, 0, 1);
    const [h, v] = guardGroups(view);
    const hDir = front.clone().applyEuler(h.rotation);
    const vDir = front.clone().applyEuler(v.rotation);
    expect(hDir.x).toBeCloseTo(1); // +x tile direction
    expect(vDir.z).toBeCloseTo(1); // +y tile = +z world
  });

  it('turns smoothly toward the new heading after a bounce', () => {
    const { guards, view } = setup();
    guards[0].dir = -1;
    view.update(guards, 0.02, 0.02);
    const mid = guardGroups(view)[0].rotation.y;
    expect(mid).not.toBeCloseTo(Math.PI / 2);
    expect(mid).not.toBeCloseTo(-Math.PI / 2);
    for (let i = 0; i < 60; i++) view.update(guards, 1 / 60, i / 60);
    const dir = new THREE.Vector3(0, 0, 1).applyEuler(guardGroups(view)[0].rotation);
    expect(dir.x).toBeCloseTo(-1);
  });
});

describe('walk bob', () => {
  it('bobs moving guards within a small height and keeps them on the floor', () => {
    const { guards, view } = setup();
    let maxBob = 0;
    for (let i = 1; i <= 120; i++) {
      updateGuards(guards, 1 / 60);
      view.update(guards, 1 / 60, i / 60);
      const model = guardGroups(view)[0].getObjectByName('model');
      expect(model.position.y).toBeGreaterThanOrEqual(0);
      expect(model.position.y).toBeLessThan(0.15);
      maxBob = Math.max(maxBob, model.position.y);
      expect(guardGroups(view)[0].position.y).toBe(0);
    }
    expect(maxBob).toBeGreaterThan(0.02);
  });

  it('keeps a standing guard nearly still', () => {
    const { guards, view } = setup();
    for (let i = 1; i <= 60; i++) {
      updateGuards(guards, 1 / 60);
      view.update(guards, 1 / 60, i / 60);
      expect(guardGroups(view)[2].getObjectByName('model').position.y).toBeLessThan(0.02);
    }
  });

  it('handles an update with no dt or time', () => {
    const { guards, view } = setup();
    expect(() => view.update(guards)).not.toThrow();
  });
});

describe('dispose', () => {
  it('removes the guards from the scene', () => {
    const { scene, view } = setup();
    view.dispose();
    expect(scene.children).not.toContain(view.group);
  });
});
