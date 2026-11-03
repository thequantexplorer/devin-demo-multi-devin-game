import { describe, expect, it } from 'vitest';
import { LEVEL_MAP } from './map.js';
import { isWall, parseLevel } from './level.js';
import { CRYSTAL_COUNT, GUARD_COUNT } from '../config.js';

describe('parseLevel with the real map', () => {
  const level = parseLevel(LEVEL_MAP);

  it('reads size and trimmed rows', () => {
    expect(level.width).toBe(17);
    expect(level.height).toBe(13);
    expect(level.tiles).toHaveLength(13);
    expect(level.tiles[0]).toBe('####T#######T####');
    level.tiles.forEach((row) => expect(row).toHaveLength(17));
  });

  it('finds the start, crystals, guards and torches', () => {
    expect(level.start).toEqual({ x: 1, y: 1 });
    expect(level.crystals).toHaveLength(CRYSTAL_COUNT);
    expect(level.crystals).toEqual([
      { x: 10, y: 1 },
      { x: 3, y: 3 },
      { x: 13, y: 5 },
      { x: 1, y: 7 },
      { x: 7, y: 11 },
    ]);
    expect(level.guards).toHaveLength(GUARD_COUNT);
    expect(level.torches).toEqual([
      { x: 4, y: 0 },
      { x: 12, y: 0 },
      { x: 0, y: 5 },
      { x: 16, y: 5 },
      { x: 4, y: 12 },
      { x: 12, y: 12 },
    ]);
  });

  it('computes guard patrol ranges up to the nearest walls', () => {
    expect(level.guards).toEqual([
      { x: 9, y: 5, axis: 'y', min: 3, max: 9 },
      { x: 4, y: 7, axis: 'x', min: 1, max: 9 },
      { x: 10, y: 11, axis: 'x', min: 5, max: 15 },
    ]);
    for (const g of level.guards) {
      const fixed = g.axis === 'x' ? g.y : g.x;
      for (let i = g.min; i <= g.max; i += 1) {
        const [x, y] = g.axis === 'x' ? [i, fixed] : [fixed, i];
        expect(isWall(level, x, y)).toBe(false);
      }
      const [bx0, by0] = g.axis === 'x' ? [g.min - 1, fixed] : [fixed, g.min - 1];
      const [bx1, by1] = g.axis === 'x' ? [g.max + 1, fixed] : [fixed, g.max + 1];
      expect(isWall(level, bx0, by0)).toBe(true);
      expect(isWall(level, bx1, by1)).toBe(true);
    }
  });

  it('places special tiles on floor', () => {
    for (const p of [level.start, ...level.crystals, ...level.guards]) {
      expect(isWall(level, p.x, p.y)).toBe(false);
    }
  });
});

describe('parseLevel on small maps', () => {
  it('handles CRLF and surrounding whitespace', () => {
    const level = parseLevel('\r\n###\r\n#P#\r\n###\r\n');
    expect(level.tiles).toEqual(['###', '#P#', '###']);
    expect(level.start).toEqual({ x: 1, y: 1 });
  });

  it('gives a boxed-in guard min === max', () => {
    const level = parseLevel(`
#####
#PH##
#####
`);
    expect(level.guards).toEqual([{ x: 2, y: 1, axis: 'x', min: 1, max: 2 }]);
    const v = parseLevel(`
###
#P#
#V#
###
`);
    expect(v.guards).toEqual([{ x: 1, y: 2, axis: 'y', min: 1, max: 2 }]);
    const solo = parseLevel('#####\n#P#H#\n#####');
    expect(solo.guards[0]).toMatchObject({ min: 3, max: 3 });
  });

  it('stops patrols at torch walls and at the map edge', () => {
    const level = parseLevel('P..H.T..\n........');
    expect(level.guards[0]).toEqual({ x: 3, y: 0, axis: 'x', min: 0, max: 4 });
  });

  it('throws on rows of different lengths', () => {
    expect(() => parseLevel('###\n#P\n###')).toThrow(/row 1 has length 2, expected 3/);
  });

  it('throws when there is no start', () => {
    expect(() => parseLevel('###\n#.#\n###')).toThrow(/no player start/);
  });

  it('throws when there is more than one start', () => {
    expect(() => parseLevel('####\n#PP#\n####')).toThrow(/more than one player start/);
  });

  it('throws on unknown characters with their position', () => {
    expect(() => parseLevel('###\n#Px\n###')).toThrow(/unknown character "x" at \(2, 1\)/);
    expect(() => parseLevel('###\n#P \n###')).toThrow(/unknown character/);
  });

  it('throws on empty or non-string input', () => {
    expect(() => parseLevel('')).toThrow(Error);
    expect(() => parseLevel(null)).toThrow(Error);
  });
});

describe('isWall', () => {
  const level = parseLevel('#T#\n#P.\n#C#');

  it('is true for # and T', () => {
    expect(isWall(level, 0, 0)).toBe(true);
    expect(isWall(level, 1, 0)).toBe(true);
  });

  it('is false for floor-like tiles', () => {
    expect(isWall(level, 1, 1)).toBe(false);
    expect(isWall(level, 2, 1)).toBe(false);
    expect(isWall(level, 1, 2)).toBe(false);
  });

  it('is true outside the map', () => {
    expect(isWall(level, -1, 1)).toBe(true);
    expect(isWall(level, 3, 1)).toBe(true);
    expect(isWall(level, 1, -1)).toBe(true);
    expect(isWall(level, 1, 3)).toBe(true);
    expect(isWall(level, 1.5, 1)).toBe(true);
  });
});
