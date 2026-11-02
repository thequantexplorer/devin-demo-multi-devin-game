import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createEnemies, updateEnemies, hitsPlayer, createEnemyMesh } from '../src/systems/enemies.js';
import { ENEMY_SPEED } from '../src/config.js';

// A tiny level written by hand, so these tests do not depend on the level system.
//   #######
//   #..E..#   E patrols left/right on row 1
//   #.#.#.#
//   #..V..#   V patrols up/down on column 3
//   #######
const map = ['#######', '#.....#', '#.#.#.#', '#.....#', '#######'];
const level = {
  isWall: (x, z) => {
    const row = map[Math.round(z)];
    return !row || row[Math.round(x)] !== '.';
  },
};
const spawns = [
  { x: 3, z: 1, axis: 'x' },
  { x: 3, z: 3, axis: 'z' },
];

function run(enemies, seconds, dt = 1 / 60, onFrame = () => {}) {
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    updateEnemies(enemies, dt);
    onFrame(enemies);
  }
  return enemies;
}

describe('createEnemies', () => {
  it('works out how far each enemy can patrol before a wall', () => {
    const enemies = createEnemies(spawns, level);
    expect(enemies).toHaveLength(2);
    expect(enemies[0]).toMatchObject({ x: 3, z: 1, axis: 'x', dir: 1, min: 1, max: 5 });
    expect(enemies[1]).toMatchObject({ x: 3, z: 3, axis: 'z', dir: 1, min: 1, max: 3 });
  });
});

describe('updateEnemies', () => {
  it('moves each enemy along its axis at ENEMY_SPEED', () => {
    const [e] = createEnemies([spawns[0]], level);
    updateEnemies([e], 0.25);
    expect(e.x).toBeCloseTo(3 + ENEMY_SPEED * 0.25);
    expect(e.z).toBe(1);
  });

  it('stops at the end of its patrol and turns around', () => {
    const [, v] = createEnemies(spawns, level);
    updateEnemies([v], 0.25);
    expect(v.z).toBe(3);
    expect(v.dir).toBe(-1);
    updateEnemies([v], 0.25);
    expect(v.z).toBeCloseTo(3 - ENEMY_SPEED * 0.25);
  });

  it('goes back and forth and never leaves its patrol', () => {
    const enemies = createEnemies(spawns, level);
    let minX = Infinity;
    let maxX = -Infinity;
    run(enemies, 10, 1 / 60, ([e, v]) => {
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x);
      expect(e.z).toBe(1);
      expect(v.x).toBe(3);
      expect(v.z).toBeGreaterThanOrEqual(1);
      expect(v.z).toBeLessThanOrEqual(3);
    });
    expect(minX).toBe(1);
    expect(maxX).toBe(5);
  });

  it('is deterministic', () => {
    const a = run(createEnemies(spawns, level), 7.3);
    const b = run(createEnemies(spawns, level), 7.3);
    expect(a).toEqual(b);
  });

  it('an enemy with nowhere to go stays still', () => {
    const boxed = { isWall: (x, z) => !(Math.round(x) === 1 && Math.round(z) === 1) };
    const [e] = createEnemies([{ x: 1, z: 1, axis: 'x' }], boxed);
    run([e], 1);
    expect(e).toMatchObject({ x: 1, z: 1, min: 1, max: 1 });
  });
});

describe('hitsPlayer', () => {
  it('is true when the enemy is closer than HIT_DISTANCE', () => {
    const e = { x: 1, z: 1 };
    expect(hitsPlayer(e, { x: 1, z: 1 })).toBe(true);
    expect(hitsPlayer(e, { x: 1.5, z: 1 })).toBe(true);
    expect(hitsPlayer(e, { x: 1.4, z: 1.4 })).toBe(true);
    expect(hitsPlayer(e, { x: 1.7, z: 1 })).toBe(false);
    expect(hitsPlayer(e, { x: 1, z: 2 })).toBe(false);
  });
});

describe('createEnemyMesh', () => {
  it('returns a three.js object', () => {
    expect(createEnemyMesh()).toBeInstanceOf(THREE.Object3D);
  });
});
