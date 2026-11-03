import { describe, expect, it } from 'vitest';
import { collectAt, createCrystals, remainingCrystals, resetCrystals } from './crystals.js';

const positions = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
  { x: 5, y: 6 },
];

describe('crystals', () => {
  it('creates uncollected copies', () => {
    const crystals = createCrystals(positions);
    expect(crystals).toEqual([
      { x: 1, y: 2, collected: false },
      { x: 3, y: 4, collected: false },
      { x: 5, y: 6, collected: false },
    ]);
    crystals[0].x = 99;
    expect(positions[0].x).toBe(1);
  });

  it('collects the crystal on a tile once', () => {
    const crystals = createCrystals(positions);
    expect(collectAt(crystals, 3, 4)).toBe(1);
    expect(crystals[1].collected).toBe(true);
    expect(collectAt(crystals, 3, 4)).toBe(-1);
    expect(remainingCrystals(crystals)).toBe(2);
  });

  it('returns -1 on empty tiles', () => {
    const crystals = createCrystals(positions);
    expect(collectAt(crystals, 0, 0)).toBe(-1);
    expect(remainingCrystals(crystals)).toBe(3);
    expect(collectAt([], 1, 2)).toBe(-1);
  });

  it('counts down to zero and resets', () => {
    const crystals = createCrystals(positions);
    positions.forEach((p) => collectAt(crystals, p.x, p.y));
    expect(remainingCrystals(crystals)).toBe(0);
    resetCrystals(crystals);
    expect(remainingCrystals(crystals)).toBe(3);
    expect(crystals.every((c) => !c.collected)).toBe(true);
  });
});
