# Crystal Keep: build plan

Crystal Keep is a small 3D maze game (Vite + three.js, tests with Vitest).
The player walks a walled keep one tile at a time (WASD / arrow keys), picks up
5 crystals and avoids 3 guards that patrol back and forth. Touching a guard
costs one of 3 lives, sends the player back to the start and makes them safe
(blinking) for `SAFE_TIME`. All 5 crystals = win. 0 lives = game over. R
restarts. A glass bar at the top shows crystals, lives and time; short sounds
play on pickup, hit, win and game over. The camera looks down at the whole
level at an angle.

The game is split into four systems, built in parallel on their own branches
from `integrate/game`, then joined by `src/game.js` and `src/main.js`.

Read `.agents/skills/design/SKILL.md` before writing any visual code: it fixes
colors, lights, materials, the HUD look and the effects. Only `three` and its
built-in `three/examples/jsm/*` add-ons may be used at runtime. Do not add
packages.

## Shared ground rules

- **Shared files (read-only for systems):** `package.json`, `package-lock.json`,
  `.npmrc`, `vite.config.js`, `index.html`, `src/style.css`, `src/config.js`,
  `src/level/map.js`, `docs/plan.md`. If a system needs a new number, define it
  as a local `const` in its own file and mention it in its final report.
- **Integration-only files:** `src/game.js`, `src/main.js` (and their tests).
  Systems must not create them.
- **Coordinates:** tiles are `(x, y)` with `x` = column, `y` = row, row 0 at the
  top of the ASCII map. World space is y-up; the level lies on the x/z plane.
  Convert with `tileToWorld(x, y) -> { x, z }` from `src/config.js`. The floor
  top is at world `y = 0`.
- **Directions:** `{ dx, dy }` in tile units, e.g. up = `{ dx: 0, dy: -1 }`.
- **Positions in tile units:** game logic works in tile units. Guards move
  smoothly, so their `x`, `y` may be fractional.
- **Logic vs. view:** each system keeps game rules in plain functions with no
  three.js or DOM (easy to test), and puts rendering in `*View.js` files.
  Views take a `THREE.Scene` (or a `THREE.Object3D` parent) and add to it; they
  never create renderers.
- **Time:** every `update(dt)` receives `dt` in seconds, already multiplied by
  the `?speed=` factor by `main.js`. Do not read the clock yourself.
- **Tests:** Vitest, placed next to the code as `*.test.js` under the system's
  folder. The default environment is `node`; for DOM tests add
  `// @vitest-environment jsdom` at the top of the test file. jsdom has no
  WebGL and `canvas.getContext('2d')` returns `null`, so canvas-texture code
  must handle a missing 2D context (fall back to a plain color) and view tests
  must only inspect the scene graph (meshes, lights, positions, visibility).
- **Install / test:** `npm install` (the committed `.npmrc` sets
  `legacy-peer-deps`), then `npm test`. `npm run build` only works after
  integration, because `src/main.js` does not exist yet.
- **Ownership:** each system edits only the files listed for it below.

## Config (`src/config.js`)

`TILE_SIZE`, `WALL_HEIGHT`, `LIVES` (3), `CRYSTAL_COUNT` (5), `GUARD_COUNT` (3),
`PLAYER_MOVE_TIME`, `SAFE_TIME`, `BLINK_RATE`, `GUARD_SPEED`, `HIT_DISTANCE`,
`CRYSTAL_SPIN_SPEED`, `CRYSTAL_BOB_HEIGHT`, `CRYSTAL_BOB_SPEED`,
`CRYSTAL_HEIGHT`, `CAMERA_FOV`, `CAMERA_TILT`, `CAMERA_MARGIN`,
`BURST_PARTICLES`, `BURST_DURATION`, `SHAKE_STRENGTH`, `SHAKE_DURATION`,
`COLORS` and `tileToWorld`.

## The level map (`src/level/map.js`)

`LEVEL_MAP` is a template string (starts and ends with a newline; trim it).
Legend: `#` wall, `T` wall with a torch, `.` floor, `P` player start,
`C` crystal, `H` guard patrolling left/right, `V` guard patrolling up/down.
`P`, `C`, `H`, `V` tiles are floor. A guard patrols its row (`H`) or column
(`V`) between the nearest walls on each side.

---

## 1. Level system (branch `system/level`)

Owns `src/level/` except `map.js`:

| File | Exports |
| --- | --- |
| `src/level/level.js` | `parseLevel(text)`, `isWall(level, x, y)` |
| `src/level/crystals.js` | `createCrystals(positions)`, `collectAt(crystals, x, y)`, `remainingCrystals(crystals)`, `resetCrystals(crystals)` |
| `src/level/textures.js` | `createFloorTexture()`, `createBrickTexture()` |
| `src/level/stage.js` | `createStage(container)`, `frameCamera(camera, level, aspect)` |
| `src/level/levelView.js` | `createLevelView(scene, level)` |
| `src/level/crystalView.js` | `createCrystalView(scene, crystals)` |
| tests | `src/level/*.test.js` |

- `parseLevel(text)` returns
  `{ width, height, tiles, start: {x, y}, crystals: [{x, y}], guards: [{x, y, axis, min, max}], torches: [{x, y}] }`.
  `tiles` is an array of row strings (trimmed map). For guards, `axis` is
  `'x'` for `H` and `'y'` for `V`; `min`/`max` are the first and last floor
  tile of the patrol along that axis (scan until a wall). Throws a clear
  `Error` if rows have different lengths, there is no / more than one `P`, or
  an unknown character appears.
- `isWall(level, x, y)` is true for `#`, `T` and anything outside the map.
- `createCrystals(positions)` returns `[{ x, y, collected: false }]`.
  `collectAt(crystals, x, y)` marks the uncollected crystal on that tile as
  collected and returns its index, or `-1`. `remainingCrystals` counts the
  uncollected ones. `resetCrystals` marks all uncollected.
- `createStage(container)` creates the `WebGLRenderer` (antialias, ACES
  filmic tone mapping, sRGB output, soft shadows), a `Scene` with background and
  fog `COLORS.background`, a `PerspectiveCamera` (`CAMERA_FOV`), an
  `EffectComposer` with `RenderPass` + `UnrealBloomPass` + `OutputPass`, and
  appends the canvas to `container`. Returns
  `{ renderer, scene, camera, composer, setLevel(level), resize(), render(), cameraBase }`.
  `setLevel(level)` calls `frameCamera` and stores the framed camera position
  in `cameraBase` (a `THREE.Vector3`); `resize()` follows the container size
  and re-frames; `render()` renders through the composer. If WebGL is not
  available, `createStage` throws an `Error` (main.js shows an error panel).
- `frameCamera(camera, level, aspect)` points the camera at the center of the
  level from `CAMERA_TILT` degrees above the horizon (from the south, i.e.
  +z side) and backs off until the whole level fits (with `CAMERA_MARGIN`)
  for the given aspect. Pure enough to test without WebGL.
- `createLevelView(scene, level)` builds the floor (checker canvas texture,
  receives shadows), the walls (brick texture, lighter top face, cast and
  receive shadows), torches on `T` tiles (small flame mesh + `COLORS.torch`
  point light on the side of the wall that faces the floor), a dim cool
  ambient/hemisphere light and one warm shadow-casting directional light
  sized to the level. Returns `{ group }`.
- `createCrystalView(scene, crystals)` makes one glowing cyan octahedron per
  crystal with a small cyan point light, spinning and bobbing. Returns
  `{ update(dt, time), hide(index), reset(), positionOf(index) }`. `hide`
  removes it from view (use `visible = false`), `reset` shows all, and
  `positionOf(index)` returns the crystal's world position as `{x, y, z}`
  (for particle bursts).

## 2. Player system (branch `system/player`)

Owns `src/player/`:

| File | Exports |
| --- | --- |
| `src/player/player.js` | `createPlayer(start)`, `tryMove(player, dx, dy, isBlocked)`, `updatePlayer(player, dt)`, `respawn(player, start)`, `isSafe(player)` |
| `src/player/input.js` | `keyToAction(key)`, `bindKeyboard(target, onAction)` |
| `src/player/playerView.js` | `createPlayerView(scene)` |
| tests | `src/player/*.test.js` |

- Player state: `{ x, y, facing: { dx, dy }, moveCooldown, safeTime }`.
  `createPlayer(start)` puts it on `start`, facing down (`{dx: 0, dy: 1}`),
  with `moveCooldown = 0`, `safeTime = 0`.
- `tryMove(player, dx, dy, isBlocked)` always sets `facing`. If
  `moveCooldown > 0` or `isBlocked(x + dx, y + dy)` is true it returns
  `false`; otherwise it moves exactly one tile, sets
  `moveCooldown = PLAYER_MOVE_TIME` and returns `true`.
- `updatePlayer(player, dt)` counts `moveCooldown` and `safeTime` down to 0.
- `respawn(player, start)` puts it back on `start`, facing down,
  `moveCooldown = 0`, `safeTime = SAFE_TIME`. `isSafe(player)` is
  `safeTime > 0`.
- `keyToAction(key)` maps `KeyboardEvent.key` to
  `{ type: 'move', dx, dy }` for `w a s d` / `W A S D` / `ArrowUp`
  `ArrowLeft` `ArrowDown` `ArrowRight`, `{ type: 'restart' }` for `r` / `R`,
  else `null`.
- `bindKeyboard(target, onAction)` listens to `keydown` on `target`, ignores
  `event.repeat`, calls `onAction(action)` for mapped keys and
  `preventDefault()`s them (so arrows do not scroll). Returns an `unbind()`
  function.
- `createPlayerView(scene)` builds a friendly warm-white capsule body with a
  small head (and a hint of a face/visor so facing is readable), casting
  shadows. Returns `{ group, snapTo(x, y), update(player, dt, time) }`.
  `update` eases the group toward the player's tile over about
  `PLAYER_MOVE_TIME` (with a small hop), turns it to face `player.facing`,
  and while `isSafe(player)` blinks it at `BLINK_RATE` (toggle visibility);
  otherwise it is visible. `snapTo` jumps there with no easing (used on
  respawn/restart).

## 3. Enemies system (branch `system/enemies`)

Owns `src/enemies/`:

| File | Exports |
| --- | --- |
| `src/enemies/guards.js` | `createGuards(specs)`, `updateGuards(guards, dt)`, `findHit(guards, x, y)`, `resetGuards(guards)` |
| `src/enemies/guardView.js` | `createGuardView(scene, guards)` |
| tests | `src/enemies/*.test.js` |

- `createGuards(specs)` takes `level.guards`
  (`[{ x, y, axis, min, max }]`) and returns
  `[{ x, y, axis, min, max, dir: 1, startX, startY }]`.
- `updateGuards(guards, dt)` moves each guard along its axis at `GUARD_SPEED`
  tiles/second, bouncing at `min` and `max` (reflect any overshoot, flip
  `dir`). A guard with `min === max` stands still. Positions stay within
  `[min, max]` for any `dt`.
- `findHit(guards, x, y)` returns the index of the first guard whose distance
  to tile `(x, y)` is below `HIT_DISTANCE`, else `-1`.
- `resetGuards(guards)` returns every guard to its start with `dir = 1`.
- `createGuardView(scene, guards)` makes one dark red-armored guard per
  guard (`COLORS.guard`, a sturdy body, a helmet, something that shows which
  way it walks) with a small orange lantern (`COLORS.lantern`) point light.
  Returns `{ update(guards, dt, time) }`, which places each guard at its
  tile position, turns it to face `dir` along its axis, and adds a small walk
  bob.

## 4. HUD and audio system (branch `system/hud-audio`)

Owns `src/hud/`, `src/audio/`, `src/fx/`:

| File | Exports |
| --- | --- |
| `src/hud/format.js` | `formatTime(seconds)`, `formatHud({ collected, total, lives, time })` |
| `src/hud/hud.js` (+ `src/hud/hud.css`) | `createHud(root)` |
| `src/audio/sounds.js` | `createSounds(options?)` |
| `src/fx/effects.js` | `createEffects(scene)` |
| tests | `src/hud/*.test.js`, `src/audio/*.test.js`, `src/fx/*.test.js` |

- `formatTime(seconds)` -> `m:ss` (floor, e.g. `0:00`, `1:05`, `12:30`).
  `formatHud(...)` -> `Crystals 0/5 · Lives 3 · 0:00` (middle dot `·`
  U+00B7 with spaces).
- `createHud(root)` builds DOM inside `root` (imports `./hud.css`): the
  translucent dark glass bar at the top center showing crystals, lives and
  time (icons or short labels, `ui-monospace` numbers, visible text reading
  `Crystals 0/5 · Lives 3 · 0:00`, and the same string as the bar's
  `aria-label`), a small controls hint under it, a centered glass banner and
  an error panel. Returns:
  - `update({ collected, total, lives, time })` - refresh the bar (only touch
    the DOM when a value changes; animate a quick pulse on the changed value).
  - `showBanner(status)` - `'won'`: title `You win!`, text
    `Press R to play again`; `'lost'`: title `Game over`, text
    `Press R to play again`. The banner element's `textContent` must contain
    `You win!` / `Game over` and `Press R to play again`. Fades/scales in
    (150-250 ms).
  - `hideBanner()`.
  - `setHint(text | null)` - show/hide the controls hint (default text
    `WASD or arrow keys to move · R to restart`).
  - `showError(message)` - error panel for when WebGL fails.
  - `element` - the HUD root element.
  The page root `#hud` has `pointer-events: none`; keep it that way.
- `createSounds({ AudioContextClass } = {})` uses Web Audio (oscillators and
  gain envelopes, no audio files). Returns `{ unlock(), play(name) }` with
  names `'pickup'` (bright rising chime), `'hit'` (low thud/buzz), `'win'`
  (short rising arpeggio), `'lose'` (falling tones), each under ~1 s.
  The `AudioContext` is created lazily in `unlock()` / the first `play()` and
  resumed if suspended. With no Web Audio available (e.g. in node), every
  call is a silent no-op that never throws. Unknown names are ignored.
- `createEffects(scene)` returns
  `{ burst(position, color), shake(strength = SHAKE_STRENGTH, duration = SHAKE_DURATION), update(dt), clear() }`.
  `burst` spawns `BURST_PARTICLES` small additive particles at a world
  position `{x, y, z}` that fly out, fall and fade over `BURST_DURATION`,
  then are removed. `update(dt)` advances particles and returns the current
  camera shake offset `{ x, y, z }` (zero when not shaking, decaying over the
  duration). `clear()` removes all particles and stops shaking.

---

## Integration (branch `integrate/game`, done after the four merges)

- `src/game.js`: `createGame(level)` holds the game state and rules using
  the system logic: `status` (`'playing' | 'won' | 'lost'`), `collected`,
  `total`, `lives`, `time`, `player`, `guards`, `crystals`. It exposes
  `move(dx, dy)`, `update(dt)` and `restart()`, which return events
  (`pickup`, `hit`, `won`, `lost`) for the views, HUD and sounds.
- `src/main.js`: builds the stage, the views, the HUD, sounds and effects;
  reads `?speed=`; binds the keyboard; runs the `requestAnimationFrame` loop;
  exposes `window.__game` (with `player`, `collected`, `lives`, `status`).
