import { describe, expect, it } from 'vitest';
import { formatCrystals, formatHud, formatTime } from './format.js';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [0.99, '0:00'],
    [5, '0:05'],
    [59.999, '0:59'],
    [60, '1:00'],
    [65, '1:05'],
    [65.7, '1:05'],
    [750, '12:30'],
    [3600, '60:00'],
  ])('formats %s as %s', (s, expected) => {
    expect(formatTime(s)).toBe(expected);
  });

  it('clamps negative and invalid input to 0:00', () => {
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(undefined)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});

describe('formatHud', () => {
  it('matches the spec string with middle dots', () => {
    expect(formatHud({ collected: 0, total: 5, lives: 3, time: 0 })).toBe('Crystals 0/5 · Lives 3 · 0:00');
  });

  it('uses U+00B7 surrounded by spaces', () => {
    const text = formatHud({ collected: 2, total: 5, lives: 1, time: 65 });
    expect(text).toBe('Crystals 2/5 \u00B7 Lives 1 \u00B7 1:05');
  });

  it('formats crystal counts', () => {
    expect(formatCrystals(5, 5)).toBe('5/5');
  });
});
