// Game rules that join the systems together. See "Game" in docs/game-design.md.
import { parseLevel } from './systems/level.js';
import { createPlayer, updatePlayer } from './systems/player.js';
import { createEnemies, updateEnemies, hitsPlayer } from './systems/enemies.js';
import { INVULNERABLE_TIME, PICKUP_DISTANCE, START_LIVES } from './config.js';

export function createGame(levelText) {
  const level = parseLevel(levelText);
  return {
    level,
    player: createPlayer(level.spawn),
    enemies: createEnemies(level.enemies, level),
    crystals: level.crystals.map(({ x, z }) => ({ x, z, taken: false })),
    collected: 0,
    total: level.crystals.length,
    lives: START_LIVES,
    time: 0,
    status: 'playing',
    invulnerable: 0,
  };
}

/** Advance the game by dt seconds. Returns the events of this frame, e.g. ['pickup']. */
export function stepGame(game, input, dt) {
  if (game.status !== 'playing') return [];
  const events = [];

  game.time += dt;
  game.invulnerable = Math.max(0, game.invulnerable - dt);

  updatePlayer(game.player, input, dt, game.level);
  updateEnemies(game.enemies, dt);

  const { player } = game;
  for (const crystal of game.crystals) {
    if (!crystal.taken && Math.hypot(crystal.x - player.x, crystal.z - player.z) < PICKUP_DISTANCE) {
      crystal.taken = true;
      game.collected += 1;
      events.push('pickup');
    }
  }

  if (game.invulnerable === 0 && game.enemies.some((enemy) => hitsPlayer(enemy, player))) {
    const { spawn } = game.level;
    game.lives -= 1;
    Object.assign(player, { x: spawn.x, z: spawn.z, targetX: spawn.x, targetZ: spawn.z });
    game.invulnerable = INVULNERABLE_TIME;
    events.push('hit');
  }

  if (game.crystals.every((crystal) => crystal.taken)) {
    game.status = 'won';
    events.push('win');
  } else if (game.lives <= 0) {
    game.status = 'lost';
    events.push('lose');
  }

  return events;
}
