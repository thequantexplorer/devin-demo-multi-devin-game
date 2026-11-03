import { LIVES } from './config.js';
import { isWall } from './level/level.js';
import { createCrystals, collectAt, remainingCrystals, resetCrystals } from './level/crystals.js';
import { createPlayer, tryMove, updatePlayer, respawn, isSafe } from './player/player.js';
import { createGuards, updateGuards, findHit, resetGuards } from './enemies/guards.js';

export function parseSpeed(search = '') {
  const value = Number.parseFloat(new URLSearchParams(search).get('speed'));
  return Number.isFinite(value) && value > 0 ? Math.min(value, 4) : 1;
}

export function createGame(level) {
  const isBlocked = (x, y) => isWall(level, x, y);

  const game = {
    level,
    status: 'playing',
    collected: 0,
    total: level.crystals.length,
    lives: LIVES,
    time: 0,
    player: createPlayer(level.start),
    guards: createGuards(level.guards),
    crystals: createCrystals(level.crystals),
  };

  function resolve(events) {
    const { player } = game;
    const index = collectAt(game.crystals, player.x, player.y);
    if (index >= 0) {
      game.collected += 1;
      events.push({ type: 'pickup', index });
      if (remainingCrystals(game.crystals) === 0) {
        game.status = 'won';
        events.push({ type: 'won' });
        return events;
      }
    }
    if (!isSafe(player) && findHit(game.guards, player.x, player.y) >= 0) {
      game.lives -= 1;
      events.push({ type: 'hit', x: player.x, y: player.y });
      if (game.lives <= 0) {
        game.status = 'lost';
        events.push({ type: 'lost' });
      } else {
        respawn(player, level.start);
      }
    }
    return events;
  }

  game.move = (dx, dy) => {
    if (game.status !== 'playing') return [];
    if (!tryMove(game.player, dx, dy, isBlocked)) return [];
    return resolve([{ type: 'step' }]);
  };

  game.update = (dt) => {
    if (game.status !== 'playing') return [];
    game.time += dt;
    updatePlayer(game.player, dt);
    updateGuards(game.guards, dt);
    return resolve([]);
  };

  game.restart = () => {
    game.status = 'playing';
    game.collected = 0;
    game.lives = LIVES;
    game.time = 0;
    game.player = createPlayer(level.start);
    resetGuards(game.guards);
    resetCrystals(game.crystals);
    return [{ type: 'restart' }];
  };

  return game;
}
