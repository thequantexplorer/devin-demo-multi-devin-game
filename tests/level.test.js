import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { parseLevel, buildLevel } from '../src/systems/level.js';
import level1 from '../src/levels/level1.js';

const small = `
#####
#P.C#
#.E.#
#####
`;

describe('parseLevel', () => {
  it('reads the size, spawn, crystals and enemies', () => {
    const level = parseLevel(small);
    expect(level.width).toBe(5);
    expect(level.height).toBe(4);
    expect(level.spawn).toEqual({ x: 1, z: 1 });
    expect(level.crystals).toEqual([{ x: 3, z: 1 }]);
    expect(level.enemies).toEqual([{ x: 2, z: 2, axis: 'x' }]);
  });

  it('reads V as an enemy that patrols up and down', () => {
    const level = parseLevel('#####\n#P.V#\n#####');
    expect(level.enemies).toEqual([{ x: 3, z: 1, axis: 'z' }]);
  });

  it('lists crystals and enemies row by row, left to right', () => {
    const level = parseLevel('######\n#C.PC#\n#CE.V#\n######');
    expect(level.crystals).toEqual([{ x: 1, z: 1 }, { x: 4, z: 1 }, { x: 1, z: 2 }]);
    expect(level.enemies).toEqual([{ x: 2, z: 2, axis: 'x' }, { x: 4, z: 2, axis: 'z' }]);
  });

  it('isWall is true for walls and false for every other tile', () => {
    const level = parseLevel(small);
    expect(level.isWall(0, 0)).toBe(true);
    expect(level.isWall(4, 2)).toBe(true);
    expect(level.isWall(1, 1)).toBe(false); // spawn
    expect(level.isWall(2, 1)).toBe(false); // floor
    expect(level.isWall(3, 1)).toBe(false); // crystal
    expect(level.isWall(2, 2)).toBe(false); // enemy
  });

  it('isWall rounds world positions to the nearest tile', () => {
    const level = parseLevel(small);
    expect(level.isWall(1.4, 1.2)).toBe(false);
    expect(level.isWall(0.6, 1)).toBe(false);
    expect(level.isWall(0.4, 1)).toBe(true);
  });

  it('isWall is true outside the map', () => {
    const level = parseLevel(small);
    expect(level.isWall(-1, 1)).toBe(true);
    expect(level.isWall(5, 1)).toBe(true);
    expect(level.isWall(1, 4)).toBe(true);
    expect(level.isWall(1, -3)).toBe(true);
  });

  it('throws when rows have different lengths', () => {
    expect(() => parseLevel('#####\n#P..#\n#####')).not.toThrow();
    expect(() => parseLevel('#####\n#P.#\n#####')).toThrow();
  });

  it('throws unless there is exactly one P', () => {
    expect(() => parseLevel('#####\n#P..#\n#####')).not.toThrow();
    expect(() => parseLevel('#####\n#...#\n#####')).toThrow();
    expect(() => parseLevel('#####\n#P.P#\n#####')).toThrow();
  });

  it('throws on unknown characters', () => {
    expect(() => parseLevel('#####\n#P..#\n#####')).not.toThrow();
    expect(() => parseLevel('#####\n#P.X#\n#####')).toThrow();
  });
});

describe('level 1', () => {
  it('is 13 by 11 with 5 crystals and 3 enemies', () => {
    const level = parseLevel(level1);
    expect(level.width).toBe(13);
    expect(level.height).toBe(11);
    expect(level.crystals).toHaveLength(5);
    expect(level.enemies).toHaveLength(3);
  });

  it('every crystal can be reached from the spawn', () => {
    const level = parseLevel(level1);
    const seen = new Set([`${level.spawn.x},${level.spawn.z}`]);
    const queue = [level.spawn];
    while (queue.length) {
      const { x, z } = queue.shift();
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${x + dx},${z + dz}`;
        if (!seen.has(key) && !level.isWall(x + dx, z + dz)) {
          seen.add(key);
          queue.push({ x: x + dx, z: z + dz });
        }
      }
    }
    for (const c of level.crystals) expect(seen.has(`${c.x},${c.z}`)).toBe(true);
  });
});

describe('buildLevel', () => {
  it('builds a floor, one mesh per wall tile and one mesh per crystal', () => {
    const level = parseLevel(small);
    const group = buildLevel(level);
    expect(group).toBeInstanceOf(THREE.Group);
    const named = (name) => group.children.filter((c) => c.name === name);
    expect(named('floor')).toHaveLength(1);
    expect(named('wall')).toHaveLength(small.split('').filter((ch) => ch === '#').length);
    const crystals = named('crystal');
    expect(crystals).toHaveLength(1);
    expect(crystals[0].userData.index).toBe(0);
    expect(crystals[0].position.x).toBe(3);
    expect(crystals[0].position.z).toBe(1);
  });

  it('puts each wall mesh on its tile', () => {
    const level = parseLevel(small);
    const walls = buildLevel(level).children.filter((c) => c.name === 'wall');
    for (const w of walls) expect(level.isWall(w.position.x, w.position.z)).toBe(true);
  });
});
