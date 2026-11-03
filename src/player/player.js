import { PLAYER_MOVE_TIME, SAFE_TIME } from '../config.js';

// Player rules in tile units. No three.js or DOM here.

const FACING_DOWN = { dx: 0, dy: 1 };

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: { ...FACING_DOWN },
    moveCooldown: 0,
    safeTime: 0,
  };
}

// Always turns to face (dx, dy). Moves one tile only when the cooldown is over
// and the target tile is not blocked. Returns whether the player moved.
export function tryMove(player, dx, dy, isBlocked) {
  player.facing = { dx, dy };
  if (player.moveCooldown > 0) return false;
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (isBlocked(nx, ny)) return false;
  player.x = nx;
  player.y = ny;
  player.moveCooldown = PLAYER_MOVE_TIME;
  return true;
}

export function updatePlayer(player, dt) {
  player.moveCooldown = Math.max(0, player.moveCooldown - dt);
  player.safeTime = Math.max(0, player.safeTime - dt);
  return player;
}

export function respawn(player, start) {
  player.x = start.x;
  player.y = start.y;
  player.facing = { ...FACING_DOWN };
  player.moveCooldown = 0;
  player.safeTime = SAFE_TIME;
  return player;
}

export function isSafe(player) {
  return player.safeTime > 0;
}
