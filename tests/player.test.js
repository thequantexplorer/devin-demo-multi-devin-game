import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPlayer, readInput, updatePlayer, createPlayerMesh } from '../src/systems/player.js';
import { PLAYER_SPEED } from '../src/config.js';

// These tests use a tiny level written by hand, so they do not depend on the level system.
const map = [
  '#######',
  '#.....#',
  '#.#P..#',
  '#.....#',
  '#######',
];
const level = {
  isWall: (x, z) => {
    const row = map[Math.round(z)];
    return !row || row[Math.round(x)] !== '.' && row[Math.round(x)] !== 'P';
  },
};
const spawn = { x: 3, z: 2 };
const none = { up: false, down: false, left: false, right: false };
const hold = (dir) => ({ ...none, [dir]: true });

function run(player, input, seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds - 1e-9; t += dt) updatePlayer(player, input, dt, level);
  return player;
}

describe('createPlayer', () => {
  it('starts on the spawn tile, not moving, facing down', () => {
    expect(createPlayer(spawn)).toMatchObject({ x: 3, z: 2, targetX: 3, targetZ: 2, facing: 'down' });
  });
});

describe('readInput', () => {
  it('maps WASD and the arrow keys (KeyboardEvent.code)', () => {
    expect(readInput(new Set())).toEqual(none);
    expect(readInput(new Set(['KeyW']))).toEqual(hold('up'));
    expect(readInput(new Set(['ArrowUp']))).toEqual(hold('up'));
    expect(readInput(new Set(['KeyS']))).toEqual(hold('down'));
    expect(readInput(new Set(['ArrowDown']))).toEqual(hold('down'));
    expect(readInput(new Set(['KeyA']))).toEqual(hold('left'));
    expect(readInput(new Set(['ArrowLeft']))).toEqual(hold('left'));
    expect(readInput(new Set(['KeyD']))).toEqual(hold('right'));
    expect(readInput(new Set(['ArrowRight']))).toEqual(hold('right'));
    expect(readInput(new Set(['KeyW', 'KeyD']))).toEqual({ ...none, up: true, right: true });
  });
});

describe('updatePlayer', () => {
  it('moves toward the next tile at PLAYER_SPEED tiles per second', () => {
    const p = createPlayer(spawn);
    updatePlayer(p, hold('right'), 0.05, level);
    expect(p.targetX).toBe(4);
    expect(p.x).toBeCloseTo(3 + PLAYER_SPEED * 0.05);
    expect(p.z).toBe(2);
    expect(p.facing).toBe('right');
  });

  it('a short tap moves exactly one tile', () => {
    const p = createPlayer(spawn);
    updatePlayer(p, hold('right'), 1 / 60, level);
    run(p, none, 0.5);
    expect(p.x).toBe(4);
    expect(p.z).toBe(2);
  });

  it('never overshoots the target tile, even with a big dt', () => {
    const p = createPlayer(spawn);
    updatePlayer(p, hold('right'), 1, level);
    expect(p.x).toBe(4);
  });

  it('keeps moving while a key is held and stops at a wall', () => {
    const p = run(createPlayer(spawn), hold('right'), 1);
    expect(p.x).toBe(5);
    expect(p.z).toBe(2);
  });

  it('up is -z and down is +z', () => {
    const up = run(createPlayer(spawn), hold('up'), 0.1);
    run(up, none, 0.5);
    expect(up).toMatchObject({ x: 3, z: 1, facing: 'up' });
    const down = run(createPlayer(spawn), hold('down'), 0.1);
    run(down, none, 0.5);
    expect(down).toMatchObject({ x: 3, z: 3, facing: 'down' });
  });

  it('does not move into a wall but still turns to face it', () => {
    const p = run(createPlayer(spawn), hold('left'), 0.5);
    expect(p).toMatchObject({ x: 3, z: 2, targetX: 3, targetZ: 2, facing: 'left' });
  });

  it('with several keys held, uses the first of up, down, left, right', () => {
    const p = run(createPlayer(spawn), { ...none, up: true, right: true }, 0.1);
    run(p, none, 0.5);
    expect(p).toMatchObject({ x: 3, z: 1 });
  });

  it('finishes the current tile before turning', () => {
    const p = createPlayer(spawn);
    updatePlayer(p, hold('right'), 0.05, level);
    updatePlayer(p, hold('up'), 0.05, level);
    expect(p.z).toBe(2);
    expect(p.x).toBeCloseTo(3 + PLAYER_SPEED * 0.1);
    run(p, none, 0.5);
    expect(p).toMatchObject({ x: 4, z: 2 });
  });
});

describe('createPlayerMesh', () => {
  it('returns a three.js object', () => {
    expect(createPlayerMesh()).toBeInstanceOf(THREE.Object3D);
  });
});
