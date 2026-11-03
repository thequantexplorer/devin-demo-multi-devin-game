// Guard patrol rules in tile units. No three.js or DOM here.
import { GUARD_SPEED, HIT_DISTANCE } from '../config.js';

export function createGuards(specs) {
  return specs.map(({ x, y, axis, min, max }) => ({
    x,
    y,
    axis,
    min,
    max,
    dir: 1,
    startX: x,
    startY: y,
  }));
}

// Moves one guard along its axis by `distance` tiles, bouncing between min
// and max. The ping-pong path is unfolded into a loop of length 2 * span so
// any overshoot (even several laps from a huge dt) is reflected exactly.
function advance(guard, distance) {
  const key = guard.axis === 'y' ? 'y' : 'x';
  const span = guard.max - guard.min;
  if (span <= 0) {
    guard[key] = guard.min;
    return;
  }
  const loop = 2 * span;
  const offset = Math.min(Math.max(guard[key] - guard.min, 0), span);
  const unfolded = guard.dir >= 0 ? offset : loop - offset;
  let u = (unfolded + distance) % loop;
  if (u < 0) u += loop;
  if (u < span) {
    guard[key] = guard.min + u;
    guard.dir = 1;
  } else {
    guard[key] = guard.min + (loop - u);
    guard.dir = -1;
  }
  guard[key] = Math.min(Math.max(guard[key], guard.min), guard.max);
}

export function updateGuards(guards, dt) {
  if (!(dt > 0)) return guards;
  const distance = GUARD_SPEED * dt;
  for (const guard of guards) advance(guard, distance);
  return guards;
}

export function findHit(guards, x, y) {
  for (let i = 0; i < guards.length; i++) {
    const g = guards[i];
    if (Math.hypot(g.x - x, g.y - y) < HIT_DISTANCE) return i;
  }
  return -1;
}

export function resetGuards(guards) {
  for (const guard of guards) {
    guard.x = guard.startX;
    guard.y = guard.startY;
    guard.dir = 1;
  }
  return guards;
}
