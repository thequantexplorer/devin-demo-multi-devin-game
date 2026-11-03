// Keyboard mapping. KeyboardEvent.key -> game action.

const MOVES = {
  w: { dx: 0, dy: -1 },
  a: { dx: -1, dy: 0 },
  s: { dx: 0, dy: 1 },
  d: { dx: 1, dy: 0 },
  arrowup: { dx: 0, dy: -1 },
  arrowleft: { dx: -1, dy: 0 },
  arrowdown: { dx: 0, dy: 1 },
  arrowright: { dx: 1, dy: 0 },
};

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export function keyToAction(key) {
  if (typeof key !== 'string') return null;
  // Letters match in either case; arrow keys only with their exact names.
  const isLetter = key.length === 1;
  if (!isLetter && !ARROW_KEYS.has(key)) return null;
  const k = key.toLowerCase();
  const move = MOVES[k];
  if (move) return { type: 'move', dx: move.dx, dy: move.dy };
  if (k === 'r') return { type: 'restart' };
  return null;
}

// Listens for keydown on `target`. Ignores auto-repeat and shortcuts that use
// Ctrl / Meta / Alt (so e.g. Ctrl+R still reloads). Returns unbind().
export function bindKeyboard(target, onAction) {
  const onKeyDown = (event) => {
    if (event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const action = keyToAction(event.key);
    if (!action) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();
    onAction(action);
  };
  target.addEventListener('keydown', onKeyDown);
  let bound = true;
  return function unbind() {
    if (!bound) return;
    bound = false;
    target.removeEventListener('keydown', onKeyDown);
  };
}
