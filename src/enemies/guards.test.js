import { describe, it, expect } from 'vitest';
import { createGuards, updateGuards, findHit, resetGuards } from './guards.js';
import { GUARD_SPEED, HIT_DISTANCE, GUARD_COUNT } from '../config.js';
import { LEVEL_MAP } from '../level/map.js';

const horizontal = () => ({ x: 4, y: 7, axis: 'x', min: 1, max: 9 });
const vertical = () => ({ x: 9, y: 5, axis: 'y', min: 3, max: 7 });

// Minimal guard extraction from the shared map so these tests don't depend on
// the level system's parser.
function guardsFromMap(text) {
  const rows = text.trim().split('\n');
  const wall = (x, y) => {
    const c = rows[y]?.[x];
    return c === undefined || c === '#' || c === 'T';
  };
  const specs = [];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== 'H' && c !== 'V') return;
      const axis = c === 'H' ? 'x' : 'y';
      const step = (d) => (axis === 'x' ? [x + d, y] : [x, y + d]);
      let lo = 0;
      while (!wall(...step(lo - 1))) lo--;
      let hi = 0;
      while (!wall(...step(hi + 1))) hi++;
      const base = axis === 'x' ? x : y;
      specs.push({ x, y, axis, min: base + lo, max: base + hi });
    });
  });
  return { rows, wall, specs };
}

describe('createGuards', () => {
  it('copies specs and adds dir and start position', () => {
    const specs = [horizontal(), vertical()];
    const guards = createGuards(specs);
    expect(guards).toEqual([
      { x: 4, y: 7, axis: 'x', min: 1, max: 9, dir: 1, startX: 4, startY: 7 },
      { x: 9, y: 5, axis: 'y', min: 3, max: 7, dir: 1, startX: 9, startY: 5 },
    ]);
  });

  it('does not share or mutate the specs', () => {
    const specs = [horizontal()];
    const guards = createGuards(specs);
    expect(guards[0]).not.toBe(specs[0]);
    updateGuards(guards, 0.5);
    expect(specs[0]).toEqual(horizontal());
  });

  it('returns an empty list for no specs', () => {
    expect(createGuards([])).toEqual([]);
  });
});

describe('updateGuards', () => {
  it('moves a horizontal guard along x at GUARD_SPEED', () => {
    const [g] = createGuards([horizontal()]);
    updateGuards([g], 0.5);
    expect(g.x).toBeCloseTo(4 + GUARD_SPEED * 0.5);
    expect(g.y).toBe(7);
    expect(g.dir).toBe(1);
  });

  it('moves a vertical guard along y at GUARD_SPEED', () => {
    const [g] = createGuards([vertical()]);
    updateGuards([g], 0.25);
    expect(g.y).toBeCloseTo(5 + GUARD_SPEED * 0.25);
    expect(g.x).toBe(9);
  });

  it('reflects the overshoot at max and flips dir', () => {
    const [g] = createGuards([vertical()]); // y 5, max 7
    const dt = 3 / GUARD_SPEED; // 2 tiles to max, 1 tile back
    updateGuards([g], dt);
    expect(g.y).toBeCloseTo(6);
    expect(g.dir).toBe(-1);
  });

  it('reflects the overshoot at min and flips dir back to 1', () => {
    const [g] = createGuards([vertical()]);
    g.dir = -1; // y 5 heading to min 3
    updateGuards([g], 2.5 / GUARD_SPEED);
    expect(g.y).toBeCloseTo(3.5);
    expect(g.dir).toBe(1);
  });

  it('turns around exactly at max', () => {
    const [g] = createGuards([vertical()]);
    updateGuards([g], 2 / GUARD_SPEED);
    expect(g.y).toBeCloseTo(7);
    updateGuards([g], 0.5 / GUARD_SPEED);
    expect(g.y).toBeCloseTo(6.5);
    expect(g.dir).toBe(-1);
  });

  it('completes full laps with a huge dt and stays in range', () => {
    const [g] = createGuards([horizontal()]); // span 8, loop 16
    updateGuards([g], (16 * 5 + 2) / GUARD_SPEED);
    expect(g.x).toBeCloseTo(6);
    expect(g.dir).toBe(1);
    updateGuards([g], 1e6);
    expect(g.x).toBeGreaterThanOrEqual(1);
    expect(g.x).toBeLessThanOrEqual(9);
  });

  it('gives the same result for one big step or many small ones', () => {
    const [a, b] = createGuards([horizontal(), horizontal()]);
    updateGuards([a], 7.3);
    for (let i = 0; i < 730; i++) updateGuards([b], 0.01);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.dir).toBe(a.dir);
  });

  it('keeps positions within [min, max] for random dt', () => {
    const guards = createGuards([horizontal(), vertical()]);
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) {
      updateGuards(guards, rand() * 3);
      for (const g of guards) {
        const v = g.axis === 'x' ? g.x : g.y;
        expect(v).toBeGreaterThanOrEqual(g.min);
        expect(v).toBeLessThanOrEqual(g.max);
        expect(Math.abs(g.dir)).toBe(1);
      }
    }
    expect(guards[0].y).toBe(7);
    expect(guards[1].x).toBe(9);
  });

  it('keeps a guard with min === max standing still', () => {
    const [g] = createGuards([{ x: 3, y: 3, axis: 'x', min: 3, max: 3 }]);
    updateGuards([g], 1);
    updateGuards([g], 100);
    expect(g).toMatchObject({ x: 3, y: 3 });
  });

  it('ignores zero, negative and NaN dt', () => {
    const [g] = createGuards([horizontal()]);
    updateGuards([g], 0);
    updateGuards([g], -1);
    updateGuards([g], NaN);
    expect(g).toMatchObject({ x: 4, y: 7, dir: 1 });
  });

  it('returns the same array', () => {
    const guards = createGuards([horizontal()]);
    expect(updateGuards(guards, 0.1)).toBe(guards);
  });
});

describe('findHit', () => {
  const guards = createGuards([
    { x: 2, y: 2, axis: 'x', min: 1, max: 5 },
    { x: 2.3, y: 2, axis: 'x', min: 1, max: 5 },
    { x: 8, y: 4, axis: 'y', min: 1, max: 6 },
  ]);

  it('returns the first guard within HIT_DISTANCE', () => {
    expect(findHit(guards, 2, 2)).toBe(0);
    expect(findHit(guards, 2.8, 2)).toBe(1);
    expect(findHit(guards, 8, 4)).toBe(2);
  });

  it('uses euclidean distance with a strict threshold', () => {
    const [g] = createGuards([{ x: 0, y: 0, axis: 'x', min: 0, max: 9 }]);
    g.x = HIT_DISTANCE;
    expect(findHit([g], 0, 0)).toBe(-1);
    g.x = HIT_DISTANCE - 1e-6;
    expect(findHit([g], 0, 0)).toBe(0);
    g.x = HIT_DISTANCE * 0.6;
    g.y = HIT_DISTANCE * 0.85; // ~1.04 * HIT_DISTANCE away
    expect(findHit([g], 0, 0)).toBe(-1);
    g.y = HIT_DISTANCE * 0.75; // ~0.96 * HIT_DISTANCE away
    expect(findHit([g], 0, 0)).toBe(0);
  });

  it('returns -1 when nobody is close or there are no guards', () => {
    expect(findHit(guards, 6, 9)).toBe(-1);
    expect(findHit([], 0, 0)).toBe(-1);
  });
});

describe('resetGuards', () => {
  it('returns every guard to its start with dir 1', () => {
    const guards = createGuards([horizontal(), vertical()]);
    updateGuards(guards, 2.7);
    expect(guards.some((g) => g.dir === -1 || g.x !== g.startX || g.y !== g.startY)).toBe(true);
    expect(resetGuards(guards)).toBe(guards);
    expect(guards[0]).toMatchObject({ x: 4, y: 7, dir: 1 });
    expect(guards[1]).toMatchObject({ x: 9, y: 5, dir: 1 });
  });
});

describe('with the shared level map', () => {
  const { wall, specs } = guardsFromMap(LEVEL_MAP);

  it('has GUARD_COUNT guards', () => {
    expect(specs).toHaveLength(GUARD_COUNT);
  });

  it('never walks a guard into a wall', () => {
    const guards = createGuards(specs);
    for (let i = 0; i < 600; i++) {
      updateGuards(guards, 1 / 60);
      for (const g of guards) {
        expect(wall(Math.floor(g.x), Math.floor(g.y))).toBe(false);
        expect(wall(Math.ceil(g.x), Math.ceil(g.y))).toBe(false);
      }
    }
  });
});
