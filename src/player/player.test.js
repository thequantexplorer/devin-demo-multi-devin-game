import { describe, expect, it, vi } from 'vitest';
import { PLAYER_MOVE_TIME, SAFE_TIME } from '../config.js';
import { createPlayer, isSafe, respawn, tryMove, updatePlayer } from './player.js';

const open = () => false;

describe('createPlayer', () => {
  it('starts on the start tile, facing down, with no timers', () => {
    expect(createPlayer({ x: 1, y: 2 })).toEqual({
      x: 1,
      y: 2,
      facing: { dx: 0, dy: 1 },
      moveCooldown: 0,
      safeTime: 0,
    });
  });

  it('does not keep a reference to the start object', () => {
    const start = { x: 3, y: 4 };
    const p = createPlayer(start);
    p.x = 9;
    expect(start).toEqual({ x: 3, y: 4 });
  });

  it('is not safe at the start', () => {
    expect(isSafe(createPlayer({ x: 0, y: 0 }))).toBe(false);
  });
});

describe('tryMove', () => {
  it.each([
    [0, -1, 5, 4],
    [0, 1, 5, 6],
    [-1, 0, 4, 5],
    [1, 0, 6, 5],
  ])('moves one tile for (%i, %i)', (dx, dy, x, y) => {
    const p = createPlayer({ x: 5, y: 5 });
    expect(tryMove(p, dx, dy, open)).toBe(true);
    expect(p).toMatchObject({ x, y, facing: { dx, dy }, moveCooldown: PLAYER_MOVE_TIME });
  });

  it('asks isBlocked about the target tile', () => {
    const p = createPlayer({ x: 2, y: 3 });
    const isBlocked = vi.fn(() => false);
    tryMove(p, 1, 0, isBlocked);
    expect(isBlocked).toHaveBeenCalledWith(3, 3);
  });

  it('does not move into a blocked tile but still turns', () => {
    const p = createPlayer({ x: 2, y: 3 });
    expect(tryMove(p, -1, 0, () => true)).toBe(false);
    expect(p).toMatchObject({ x: 2, y: 3, facing: { dx: -1, dy: 0 }, moveCooldown: 0 });
  });

  it('does not move while the cooldown runs but still turns', () => {
    const p = createPlayer({ x: 2, y: 3 });
    tryMove(p, 1, 0, open);
    const isBlocked = vi.fn(() => false);
    expect(tryMove(p, 0, -1, isBlocked)).toBe(false);
    expect(p).toMatchObject({ x: 3, y: 3, facing: { dx: 0, dy: -1 } });
    expect(isBlocked).not.toHaveBeenCalled();
  });

  it('can move again once the cooldown has run out', () => {
    const p = createPlayer({ x: 2, y: 3 });
    tryMove(p, 1, 0, open);
    updatePlayer(p, PLAYER_MOVE_TIME / 2);
    expect(tryMove(p, 1, 0, open)).toBe(false);
    updatePlayer(p, PLAYER_MOVE_TIME / 2);
    expect(tryMove(p, 1, 0, open)).toBe(true);
    expect(p.x).toBe(4);
  });

  it('stores a fresh facing object', () => {
    const p = createPlayer({ x: 0, y: 0 });
    const before = p.facing;
    tryMove(p, 1, 0, open);
    expect(p.facing).not.toBe(before);
    expect(before).toEqual({ dx: 0, dy: 1 });
  });

  it('walks along a corridor and stops at the wall', () => {
    const walls = new Set(['4,1']);
    const isBlocked = (x, y) => walls.has(`${x},${y}`);
    const p = createPlayer({ x: 1, y: 1 });
    const moves = [];
    for (let i = 0; i < 5; i++) {
      moves.push(tryMove(p, 1, 0, isBlocked));
      updatePlayer(p, PLAYER_MOVE_TIME);
    }
    expect(moves).toEqual([true, true, false, false, false]);
    expect(p.x).toBe(3);
  });
});

describe('updatePlayer', () => {
  it('counts both timers down', () => {
    const p = { ...createPlayer({ x: 0, y: 0 }), moveCooldown: 0.1, safeTime: 1 };
    updatePlayer(p, 0.04);
    expect(p.moveCooldown).toBeCloseTo(0.06);
    expect(p.safeTime).toBeCloseTo(0.96);
  });

  it('clamps timers at 0 for large dt', () => {
    const p = { ...createPlayer({ x: 0, y: 0 }), moveCooldown: 0.1, safeTime: 1 };
    updatePlayer(p, 10);
    expect(p.moveCooldown).toBe(0);
    expect(p.safeTime).toBe(0);
  });

  it('keeps zero timers at zero and does not move the player', () => {
    const p = createPlayer({ x: 4, y: 7 });
    updatePlayer(p, 0.5);
    expect(p).toMatchObject({ x: 4, y: 7, moveCooldown: 0, safeTime: 0 });
  });
});

describe('respawn / isSafe', () => {
  it('returns to start, faces down, clears cooldown and becomes safe', () => {
    const start = { x: 1, y: 1 };
    const p = createPlayer(start);
    tryMove(p, 1, 0, open);
    respawn(p, start);
    expect(p).toEqual({
      x: 1,
      y: 1,
      facing: { dx: 0, dy: 1 },
      moveCooldown: 0,
      safeTime: SAFE_TIME,
    });
    expect(isSafe(p)).toBe(true);
  });

  it('stays safe for SAFE_TIME, then not', () => {
    const p = createPlayer({ x: 1, y: 1 });
    respawn(p, { x: 1, y: 1 });
    updatePlayer(p, SAFE_TIME - 0.01);
    expect(isSafe(p)).toBe(true);
    updatePlayer(p, 0.02);
    expect(isSafe(p)).toBe(false);
  });

  it('can move right after a respawn', () => {
    const p = createPlayer({ x: 1, y: 1 });
    tryMove(p, 1, 0, open);
    respawn(p, { x: 1, y: 1 });
    expect(tryMove(p, 0, 1, open)).toBe(true);
  });
});
