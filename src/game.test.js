import { describe, it, expect } from 'vitest';
import { LIVES, PLAYER_MOVE_TIME, SAFE_TIME } from './config.js';
import { parseLevel } from './level/level.js';
import { LEVEL_MAP } from './level/map.js';
import { createGame, parseSpeed } from './game.js';

const CRYSTAL_ROW = `
#####
#PCC#
#####
`;
// The V guard has walls above and below, so it stands still on (3, 1).
const GUARD_ROW = `
#######
#P.V.C#
#######
`;

const step = (game, dx, dy) => {
  const events = game.move(dx, dy);
  game.update(PLAYER_MOVE_TIME + 0.001);
  return events;
};
const types = (events) => events.map((e) => e.type);

describe('createGame', () => {
  it('starts playing with full lives and nothing collected', () => {
    const game = createGame(parseLevel(LEVEL_MAP));
    expect(game.status).toBe('playing');
    expect(game.lives).toBe(LIVES);
    expect(game.collected).toBe(0);
    expect(game.total).toBe(5);
    expect(game.guards).toHaveLength(3);
    expect([game.player.x, game.player.y]).toEqual([1, 1]);
  });

  it('stops at walls', () => {
    const game = createGame(parseLevel(CRYSTAL_ROW));
    expect(game.move(0, -1)).toEqual([]);
    expect([game.player.x, game.player.y]).toEqual([1, 1]);
  });

  it('picks up crystals and wins when all are collected', () => {
    const game = createGame(parseLevel(CRYSTAL_ROW));
    expect(types(step(game, 1, 0))).toEqual(['step', 'pickup']);
    expect(game.collected).toBe(1);
    expect(types(step(game, 1, 0))).toEqual(['step', 'pickup', 'won']);
    expect(game.status).toBe('won');
    expect(game.move(-1, 0)).toEqual([]);
    const time = game.time;
    expect(game.update(1)).toEqual([]);
    expect(game.time).toBe(time);
  });

  it('costs a life on a guard hit, respawns and gives a safe time', () => {
    const game = createGame(parseLevel(GUARD_ROW));
    step(game, 1, 0);
    const events = step(game, 1, 0);
    expect(types(events)).toEqual(['step', 'hit']);
    expect(events[1]).toMatchObject({ x: 3, y: 1 });
    expect(game.lives).toBe(LIVES - 1);
    expect([game.player.x, game.player.y]).toEqual([1, 1]);
    step(game, 1, 0);
    expect(types(step(game, 1, 0))).toEqual(['step']);
    expect(game.lives).toBe(LIVES - 1);
  });

  it('ends the game when the last life is lost, and R restarts it', () => {
    const game = createGame(parseLevel(GUARD_ROW));
    let last = [];
    for (let i = 0; i < LIVES; i += 1) {
      game.update(SAFE_TIME + 0.01);
      step(game, 1, 0);
      last = step(game, 1, 0);
    }
    expect(types(last)).toEqual(['step', 'hit', 'lost']);
    expect(game.status).toBe('lost');
    expect(game.lives).toBe(0);

    expect(types(game.restart())).toEqual(['restart']);
    expect(game.status).toBe('playing');
    expect(game.lives).toBe(LIVES);
    expect(game.time).toBe(0);
    expect(game.crystals.every((c) => !c.collected)).toBe(true);
    expect([game.player.x, game.player.y]).toEqual([1, 1]);
  });

  it('counts time while playing', () => {
    const game = createGame(parseLevel(LEVEL_MAP));
    game.update(0.5);
    game.update(0.25);
    expect(game.time).toBeCloseTo(0.75);
  });
});

describe('parseSpeed', () => {
  it('reads ?speed= and falls back to 1', () => {
    expect(parseSpeed('?speed=0.25')).toBe(0.25);
    expect(parseSpeed('')).toBe(1);
    expect(parseSpeed('?speed=abc')).toBe(1);
    expect(parseSpeed('?speed=-2')).toBe(1);
    expect(parseSpeed('?speed=99')).toBe(4);
  });
});
