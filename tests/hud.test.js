import { describe, it, expect } from 'vitest';
import { formatTime, hudText, bannerText } from '../src/systems/hud.js';

describe('formatTime', () => {
  it('shows minutes and two-digit seconds, rounded down', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5.9)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
});

describe('hudText', () => {
  it('shows crystals, lives and time', () => {
    expect(hudText({ collected: 2, total: 5, lives: 3, time: 42.5 })).toBe('Crystals 2/5 · Lives 3 · 0:42');
    expect(hudText({ collected: 0, total: 1, lives: 0, time: 61 })).toBe('Crystals 0/1 · Lives 0 · 1:01');
  });
});

describe('bannerText', () => {
  it('is empty while playing and tells the player what to do after the game ends', () => {
    expect(bannerText('playing')).toBe('');
    expect(bannerText('won')).toBe('You win! Press R to play again');
    expect(bannerText('lost')).toBe('Game over. Press R to try again');
  });
});
