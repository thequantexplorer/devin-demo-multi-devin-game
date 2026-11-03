// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { bindKeyboard, keyToAction } from './input.js';

const UP = { type: 'move', dx: 0, dy: -1 };
const DOWN = { type: 'move', dx: 0, dy: 1 };
const LEFT = { type: 'move', dx: -1, dy: 0 };
const RIGHT = { type: 'move', dx: 1, dy: 0 };

describe('keyToAction', () => {
  it.each([
    ['w', UP], ['W', UP], ['ArrowUp', UP],
    ['s', DOWN], ['S', DOWN], ['ArrowDown', DOWN],
    ['a', LEFT], ['A', LEFT], ['ArrowLeft', LEFT],
    ['d', RIGHT], ['D', RIGHT], ['ArrowRight', RIGHT],
  ])('maps %s to a move', (key, action) => {
    expect(keyToAction(key)).toEqual(action);
  });

  it.each(['r', 'R'])('maps %s to restart', (key) => {
    expect(keyToAction(key)).toEqual({ type: 'restart' });
  });

  it.each(['x', 'q', ' ', 'Enter', 'Escape', 'Shift', 'arrowup', 'ARROWUP', 'Dead', '', 'F5'])(
    'ignores %j',
    (key) => {
      expect(keyToAction(key)).toBeNull();
    },
  );

  it('ignores non-strings', () => {
    expect(keyToAction(undefined)).toBeNull();
    expect(keyToAction(null)).toBeNull();
    expect(keyToAction(87)).toBeNull();
  });

  it('returns a fresh object each time', () => {
    const a = keyToAction('w');
    a.dx = 5;
    expect(keyToAction('w')).toEqual(UP);
  });
});

function press(target, key, init = {}) {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('bindKeyboard', () => {
  it('calls onAction for mapped keys and prevents their default', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    const e1 = press(window, 'ArrowUp');
    const e2 = press(window, 'r');
    expect(onAction.mock.calls).toEqual([[UP], [{ type: 'restart' }]]);
    expect(e1.defaultPrevented).toBe(true);
    expect(e2.defaultPrevented).toBe(true);
    unbind();
  });

  it('ignores unmapped keys and leaves their default alone', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    const e = press(window, 'Tab');
    expect(onAction).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    unbind();
  });

  it('ignores auto-repeat', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    press(window, 'd', { repeat: true });
    expect(onAction).not.toHaveBeenCalled();
    unbind();
  });

  it('leaves browser shortcuts (Ctrl/Meta/Alt) alone', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    const e = press(window, 'r', { ctrlKey: true });
    press(window, 'r', { metaKey: true });
    press(window, 'w', { altKey: true });
    expect(onAction).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    unbind();
  });

  it('still accepts Shift (capital letters)', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    press(window, 'W', { shiftKey: true });
    expect(onAction).toHaveBeenCalledWith(UP);
    unbind();
  });

  it('receives events bubbling from children of the target', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(document, onAction);
    press(document.body, 's');
    expect(onAction).toHaveBeenCalledWith(DOWN);
    unbind();
  });

  it('stops listening after unbind (and unbind is idempotent)', () => {
    const onAction = vi.fn();
    const unbind = bindKeyboard(window, onAction);
    unbind();
    unbind();
    press(window, 'w');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('works with any EventTarget-like object', () => {
    const listeners = {};
    const target = {
      addEventListener: vi.fn((type, fn) => { listeners[type] = fn; }),
      removeEventListener: vi.fn(),
    };
    const onAction = vi.fn();
    const unbind = bindKeyboard(target, onAction);
    expect(target.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    const event = { key: 'a', repeat: false, preventDefault: vi.fn() };
    listeners.keydown(event);
    expect(onAction).toHaveBeenCalledWith(LEFT);
    expect(event.preventDefault).toHaveBeenCalled();
    unbind();
    expect(target.removeEventListener).toHaveBeenCalledWith('keydown', listeners.keydown);
  });
});
