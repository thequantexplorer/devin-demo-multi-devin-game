// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createHud } from './hud.js';

let root;
let hud;

beforeEach(() => {
  document.body.innerHTML = '<div id="hud"></div>';
  root = document.getElementById('hud');
  hud = createHud(root);
});

const bar = () => root.querySelector('.hud-bar');
const value = (key) => root.querySelector(`.hud-item--${key} .hud-value`);
const banner = () => root.querySelector('.hud-banner');
const hint = () => root.querySelector('.hud-hint');
const errorPanel = () => root.querySelector('.hud-error');

describe('createHud', () => {
  it('builds its DOM inside root and exposes element', () => {
    expect(hud.element.parentElement).toBe(root);
    expect(root.contains(bar())).toBe(true);
    expect(root.contains(hint())).toBe(true);
    expect(root.contains(banner())).toBe(true);
    expect(root.contains(errorPanel())).toBe(true);
  });

  it('starts showing the default state', () => {
    expect(bar().textContent).toBe('Crystals 0/5 · Lives 3 · 0:00');
    expect(bar().getAttribute('aria-label')).toBe('Crystals 0/5 · Lives 3 · 0:00');
  });

  it('update refreshes visible text and aria-label', () => {
    hud.update({ collected: 2, total: 5, lives: 2, time: 75.4 });
    expect(bar().textContent).toBe('Crystals 2/5 · Lives 2 · 1:15');
    expect(bar().getAttribute('aria-label')).toBe('Crystals 2/5 · Lives 2 · 1:15');
  });

  it('only touches the DOM when a value changes', () => {
    hud.update({ collected: 1, total: 5, lives: 3, time: 1 });
    const crystalsText = value('crystals').firstChild;
    const timeText = value('time').firstChild;
    const writes = [];
    const observer = new MutationObserver((records) => writes.push(...records));
    observer.observe(bar(), { subtree: true, childList: true, characterData: true, attributes: true });
    hud.update({ collected: 1, total: 5, lives: 3, time: 1.5 });
    observer.takeRecords().forEach((r) => writes.push(r));
    expect(writes).toHaveLength(0);
    expect(value('crystals').firstChild).toBe(crystalsText);
    expect(value('time').firstChild).toBe(timeText);
    observer.disconnect();
  });

  it('pulses the crystals and lives values when they change, not the timer', () => {
    hud.update({ collected: 1, total: 5, lives: 3, time: 0 });
    expect(value('crystals').classList.contains('is-pulsing')).toBe(true);
    expect(value('lives').classList.contains('is-pulsing')).toBe(false);
    hud.update({ collected: 1, total: 5, lives: 2, time: 4 });
    expect(value('lives').classList.contains('is-pulsing')).toBe(true);
    expect(value('time').classList.contains('is-pulsing')).toBe(false);
    value('lives').dispatchEvent(new Event('animationend'));
    expect(value('lives').classList.contains('is-pulsing')).toBe(false);
  });

  it('uses mono numbers in dedicated value elements', () => {
    expect(value('crystals').textContent).toBe('0/5');
    expect(value('lives').textContent).toBe('3');
    expect(value('time').textContent).toBe('0:00');
  });

  it('shows the win banner', () => {
    hud.showBanner('won');
    const b = banner();
    expect(b.classList.contains('is-visible')).toBe(true);
    expect(b.getAttribute('aria-hidden')).toBe('false');
    expect(b.dataset.status).toBe('won');
    expect(b.textContent).toContain('You win!');
    expect(b.textContent).toContain('Press R to play again');
    expect(b.textContent).toBe('You win! Press R to play again');
  });

  it('shows the game over banner', () => {
    hud.showBanner('lost');
    expect(banner().textContent).toContain('Game over');
    expect(banner().textContent).toContain('Press R to play again');
    expect(banner().dataset.status).toBe('lost');
  });

  it('hides the banner and ignores unknown statuses', () => {
    hud.showBanner('won');
    hud.hideBanner();
    expect(banner().classList.contains('is-visible')).toBe(false);
    expect(banner().getAttribute('aria-hidden')).toBe('true');
    hud.showBanner('playing');
    expect(banner().classList.contains('is-visible')).toBe(false);
  });

  it('shows the default hint and can change or hide it', () => {
    expect(hint().hidden).toBe(false);
    expect(hint().textContent).toBe('WASD or arrow keys to move · R to restart');
    hud.setHint(null);
    expect(hint().hidden).toBe(true);
    hud.setHint('Find the crystals');
    expect(hint().hidden).toBe(false);
    expect(hint().textContent).toBe('Find the crystals');
  });

  it('shows an error panel', () => {
    expect(errorPanel().hidden).toBe(true);
    hud.showBanner('won');
    hud.showError('WebGL is not available in this browser.');
    expect(errorPanel().hidden).toBe(false);
    expect(errorPanel().getAttribute('role')).toBe('alert');
    expect(errorPanel().textContent).toContain('WebGL is not available in this browser.');
    expect(bar().hidden).toBe(true);
    expect(banner().classList.contains('is-visible')).toBe(false);
  });

  it('does not add pointer events to the page root', () => {
    expect(root.style.pointerEvents).toBe('');
    expect(root.id).toBe('hud');
  });
});
