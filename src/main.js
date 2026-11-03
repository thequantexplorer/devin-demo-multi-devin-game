import { COLORS, tileToWorld } from './config.js';
import { LEVEL_MAP } from './level/map.js';
import { parseLevel } from './level/level.js';
import { createStage } from './level/stage.js';
import { createLevelView } from './level/levelView.js';
import { createCrystalView } from './level/crystalView.js';
import { createPlayerView } from './player/playerView.js';
import { bindKeyboard } from './player/input.js';
import { createGuardView } from './enemies/guardView.js';
import { createHud } from './hud/hud.js';
import { createSounds } from './audio/sounds.js';
import { createEffects } from './fx/effects.js';
import { createGame, parseSpeed } from './game.js';

const HINT = 'WASD or arrow keys to move · R to restart';
const MAX_FRAME = 0.05;

function start() {
  const hud = createHud(document.getElementById('hud'));
  const level = parseLevel(LEVEL_MAP);
  const game = createGame(level);
  window.__game = game;

  let stage;
  try {
    stage = createStage(document.getElementById('stage'));
  } catch (error) {
    console.error(error);
    hud.showError('Crystal Keep needs WebGL. Try another browser or turn on hardware acceleration.');
    return;
  }

  const speed = parseSpeed(window.location.search);
  stage.setLevel(level);
  createLevelView(stage.scene, level);
  const crystalView = createCrystalView(stage.scene, game.crystals);
  const playerView = createPlayerView(stage.scene);
  const guardView = createGuardView(stage.scene, game.guards);
  const sounds = createSounds();
  const effects = createEffects(stage.scene);
  playerView.snapTo(level.start.x, level.start.y);
  hud.setHint(HINT);

  function handle(events) {
    for (const event of events) {
      switch (event.type) {
        case 'pickup':
          crystalView.hide(event.index);
          effects.burst(crystalView.positionOf(event.index), COLORS.crystal);
          sounds.play('pickup');
          break;
        case 'hit': {
          const at = tileToWorld(event.x, event.y);
          effects.burst({ x: at.x, y: 0.6, z: at.z }, COLORS.guard);
          effects.shake();
          sounds.play('hit');
          playerView.snapTo(game.player.x, game.player.y);
          break;
        }
        case 'won':
          sounds.play('win');
          hud.showBanner('won');
          break;
        case 'lost':
          sounds.play('lose');
          hud.showBanner('lost');
          break;
        case 'restart':
          crystalView.reset();
          effects.clear();
          hud.hideBanner();
          hud.setHint(HINT);
          playerView.snapTo(game.player.x, game.player.y);
          break;
        default:
          break;
      }
    }
  }

  bindKeyboard(window, (action) => {
    sounds.unlock();
    if (action.type === 'restart') {
      handle(game.restart());
    } else if (action.type === 'move') {
      const events = game.move(action.dx, action.dy);
      if (events.length) hud.setHint(null);
      handle(events);
    }
  });
  window.addEventListener('pointerdown', () => sounds.unlock());
  window.addEventListener('resize', () => stage.resize());

  let last = performance.now();
  let clock = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, MAX_FRAME) * speed;
    last = now;
    clock += dt;
    handle(game.update(dt));
    crystalView.update(dt, clock);
    playerView.update(game.player, dt, clock);
    guardView.update(game.guards, dt, clock);
    const shake = effects.update(dt);
    const base = stage.cameraBase;
    stage.camera.position.set(base.x + shake.x, base.y + shake.y, base.z + shake.z);
    hud.update(game);
    stage.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
