import { describe, it, expect } from 'vitest';
import { createGame, stepGame } from '../src/game.js';
import { INVULNERABLE_TIME, START_LIVES } from '../src/config.js';
import level1 from '../src/levels/level1.js';

// This file tests the systems working together, so it only passes after all four are merged.
const map = `
#######
#P.C..#
#.....#
#..E..#
#######
`;
const none = { up: false, down: false, left: false, right: false };
const hold = (dir) => ({ ...none, [dir]: true });

function run(game, input, seconds, dt = 1 / 60) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...stepGame(game, input, dt));
  return events;
}

function moveOntoEnemy(game) {
  const e = game.enemies[0];
  Object.assign(game.player, { x: e.x, z: e.z, targetX: e.x, targetZ: e.z });
}

describe('createGame', () => {
  it('sets up a new game from a level', () => {
    const game = createGame(map);
    expect(game).toMatchObject({ status: 'playing', lives: START_LIVES, collected: 0, total: 1, time: 0 });
    expect(game.player).toMatchObject({ x: 1, z: 1 });
    expect(game.enemies).toHaveLength(1);
    expect(game.crystals).toEqual([{ x: 3, z: 1, taken: false }]);
  });
});

describe('stepGame', () => {
  it('counts time while playing', () => {
    const game = createGame(map);
    run(game, none, 1);
    expect(game.time).toBeCloseTo(1);
  });

  it('picks up a crystal the player walks over, and wins when all are taken', () => {
    const game = createGame(map);
    const events = run(game, hold('right'), 0.5);
    expect(game.crystals[0].taken).toBe(true);
    expect(game.collected).toBe(1);
    expect(game.status).toBe('won');
    expect(events).toEqual(['pickup', 'win']);
  });

  it('an enemy hit costs a life and sends the player back to the spawn', () => {
    const game = createGame(map);
    moveOntoEnemy(game);
    expect(stepGame(game, none, 1 / 60)).toEqual(['hit']);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(game.player).toMatchObject({ x: 1, z: 1, targetX: 1, targetZ: 1 });
  });

  it('the player cannot be hit again for INVULNERABLE_TIME seconds', () => {
    const game = createGame(map);
    moveOntoEnemy(game);
    stepGame(game, none, 1 / 60);
    moveOntoEnemy(game);
    expect(stepGame(game, none, 1 / 60)).toEqual([]);
    run(game, none, INVULNERABLE_TIME);
    moveOntoEnemy(game);
    expect(stepGame(game, none, 1 / 60)).toEqual(['hit']);
    expect(game.lives).toBe(START_LIVES - 2);
  });

  it('losing the last life ends the game', () => {
    const game = createGame(map);
    game.lives = 1;
    moveOntoEnemy(game);
    expect(stepGame(game, none, 1 / 60)).toEqual(['hit', 'lose']);
    expect(game.lives).toBe(0);
    expect(game.status).toBe('lost');
  });

  it('nothing moves after the game ends', () => {
    const game = createGame(map);
    game.status = 'lost';
    const before = JSON.stringify(game);
    expect(run(game, hold('down'), 1)).toEqual([]);
    expect(JSON.stringify(game)).toBe(before);
  });

  it('level 1 plays the same way every time', () => {
    const script = ['down', 'down', 'right', 'right', 'up', 'right', 'down', 'left'];
    const play = () => {
      const game = createGame(level1);
      const events = script.flatMap((dir) => run(game, hold(dir), 0.75));
      return JSON.stringify({ game, events });
    };
    expect(play()).toBe(play());
  });
});
