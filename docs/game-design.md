# Crystal Keep: game design

A small 3D maze game in the browser. The player walks through a walled keep, picks up 5 crystals and avoids 3 patrolling guards. It is built with [three.js](https://threejs.org) and [Vite](https://vite.dev).

## How it plays

- The camera looks down at the whole level from above and behind, at an angle.
- The player moves one tile at a time with **WASD** or the **arrow keys**. A tap moves one tile. Holding a key keeps moving.
- Walls block the player.
- Walking over a crystal picks it up.
- Touching a guard costs one life and sends the player back to the start. After a hit, the player is safe for a short time.
- Pick up all 5 crystals to win. Lose all 3 lives and the game is over. Press **R** to start again.
- A bar at the top shows crystals, lives and time. Short sounds play on pickup, hit, win and game over.

There is no randomness. The same keys in the same order always give the same game.

## Coordinates and shared numbers

- One tile is one unit. The tile in column `x`, row `z` of the map has its center at world position `(x, 0, z)`.
- "Up" on the keyboard is `-z`. "Down" is `+z`. "Left" is `-x`. "Right" is `+x`.
- The shared numbers are in `src/config.js`. Read them from there. Do not change them.

| Name | Value | Meaning |
| --- | --- | --- |
| `PLAYER_SPEED` | 6 | tiles per second |
| `ENEMY_SPEED` | 2 | tiles per second |
| `HIT_DISTANCE` | 0.6 | a guard closer than this hits the player |
| `PICKUP_DISTANCE` | 0.5 | a crystal closer than this is picked up |
| `START_LIVES` | 3 | lives at the start |
| `INVULNERABLE_TIME` | 1.5 | seconds of safety after a hit |

## Systems

The game is split into four systems plus the game rules that join them. Each system has its own files and its own test file, so the four systems can be built at the same time on separate branches without touching each other's files.

| System | Branch | Files it owns | Test |
| --- | --- | --- | --- |
| Level | `system/level` | `src/systems/level.js` | `tests/level.test.js` |
| Player | `system/player` | `src/systems/player.js` | `tests/player.test.js` |
| Enemies | `system/enemies` | `src/systems/enemies.js` | `tests/enemies.test.js` |
| HUD and audio | `system/hud-audio` | `src/systems/hud.js`, `src/systems/audio.js`, `src/style.css` | `tests/hud.test.js`, `tests/audio.test.js` |
| Game (integration) | `integrate/game` | `src/game.js`, `src/main.js` | `tests/game.test.js` |

Rules for every system branch:

- Only edit the files your system owns. Do not edit `src/config.js`, `src/levels/`, `package.json` or another system's files.
- Do not import another system. The player and enemy systems get a `level` object with an `isWall(x, z)` method. Their tests pass a hand-written one.
- Run your own test file with `npx vitest run tests/<name>.test.js`. It must pass before you push.
- The other test files will still fail on your branch. That is expected.

### Level (`src/systems/level.js`)

Levels are ASCII maps. Level 1 is in `src/levels/level1.js`.

| Character | Meaning |
| --- | --- |
| `#` | wall |
| `.` | floor |
| `P` | player start (exactly one) |
| `C` | crystal |
| `E` | guard that patrols left and right |
| `V` | guard that patrols up and down |

`parseLevel(text)` returns `{ width, height, spawn, crystals, enemies, isWall }`:

- Ignore blank lines at the start and end of the text. Each remaining line is one row.
- `spawn` is `{ x, z }`. `crystals` is a list of `{ x, z }`. `enemies` is a list of `{ x, z, axis }`, where `axis` is `'x'` for `E` and `'z'` for `V`. Both lists go row by row, left to right.
- Tiles under `P`, `C`, `E` and `V` are floor.
- `isWall(x, z)` rounds `x` and `z` to the nearest tile. It returns `true` for walls and for anything outside the map.
- Throw an `Error` if rows have different lengths, if there is not exactly one `P`, or on any other character.

`buildLevel(level)` returns a `THREE.Group` with:

- one floor mesh named `'floor'` that covers the map,
- one mesh named `'wall'` per wall tile, a box about 1 tall, centered on its tile,
- one mesh named `'crystal'` per crystal at its tile, with `userData.index` set to its index in `level.crystals`. Make crystals easy to see (for example a glowing octahedron).

### Player (`src/systems/player.js`)

- `createPlayer(spawn)` returns `{ x, z, targetX, targetZ, facing }`. It starts on the spawn tile with the target on the same tile and `facing: 'down'`.
- `readInput(keysDown)` takes a `Set` of `KeyboardEvent.code` values and returns `{ up, down, left, right }` booleans. `KeyW`/`ArrowUp` is up, `KeyS`/`ArrowDown` is down, `KeyA`/`ArrowLeft` is left, `KeyD`/`ArrowRight` is right.
- `updatePlayer(player, input, dt, level)` changes the player in place and returns it:
  1. If the player is on its target tile and a direction is held, pick one. If several are held, use the first of up, down, left, right. Set `facing` to it. If the next tile in that direction is not a wall, make it the new target.
  2. Move toward the target at `PLAYER_SPEED` tiles per second. If this frame would reach or pass the target, stop exactly on it. Leftover time in the frame is not used.
  3. A new direction is only picked once the current tile is reached.
- `createPlayerMesh()` returns a `THREE.Object3D`, for example a blue capsule about 0.8 tall standing on the floor.

### Enemies (`src/systems/enemies.js`)

- `createEnemies(spawns, level)` returns one guard per spawn: `{ x, z, axis, dir: 1, min, max }`. `min` and `max` are the lowest and highest tile on the guard's axis that it can reach from its spawn without crossing a wall.
- `updateEnemies(enemies, dt)` changes the guards in place and returns the array. Each guard moves along its axis in direction `dir` at `ENEMY_SPEED`. If a move would pass `min` or `max`, the guard stops exactly on it and `dir` flips. A guard with `min === max` does not move.
- `hitsPlayer(enemy, player)` is `true` when the distance between them in `x`/`z` is less than `HIT_DISTANCE`.
- `createEnemyMesh()` returns a `THREE.Object3D`, for example a red cone or sphere.

### HUD and audio (`src/systems/hud.js`, `src/systems/audio.js`)

HUD:

- `formatTime(seconds)` returns `m:ss`, rounded down. `65` is `'1:05'`.
- `hudText({ collected, total, lives, time })` returns `'Crystals 2/5 · Lives 3 · 0:42'`.
- `bannerText(status)` returns `''` for `'playing'`, `'You win! Press R to play again'` for `'won'` and `'Game over. Press R to try again'` for `'lost'`.
- `createHud(root)` adds two elements to `root`: a `.hud-bar` with `hudText` and a `.hud-banner` with `bannerText`. It returns `{ update(state) }`, which refreshes both from a game state. The styles are in `src/style.css`.

Audio:

- There are no audio files. Each sound in `SOUNDS` is one oscillator with a `type`, a frequency `freq` in Hz and a `duration` in seconds.
- `createAudio(AudioContextClass)` returns `{ play(name) }`. The page passes `window.AudioContext`.
- Create the `AudioContext` on the first `play`, not before, because browsers block audio until the user presses a key. Create it only once. If its `state` is `'suspended'`, call `resume()`.
- `play(name)` creates an oscillator with that sound's `type` and `freq`, connects it through a gain node to `destination`, starts it at `currentTime` and stops it at `currentTime + duration`. Fade the gain out so it does not click.
- `play` throws an `Error` whose message includes the name when the name is unknown. If `AudioContextClass` is missing, `play` does nothing.

### Game (`src/game.js` and `src/main.js`)

This is written last, after the four system branches are merged.

`createGame(levelText)` returns:

```js
{ level, player, enemies, crystals, collected, total, lives, time, status, invulnerable }
```

- `crystals` is a copy of the level's crystals with `taken: false` on each.
- `status` is `'playing'`, `'won'` or `'lost'`. `invulnerable` is the seconds of safety left, starting at 0.

`stepGame(game, input, dt)` advances the game and returns this frame's events, in this order:

1. If `status` is not `'playing'`, change nothing and return `[]`.
2. Add `dt` to `time`. Take `dt` off `invulnerable` (not below 0).
3. Update the player, then the guards.
4. Each crystal that is not taken and is closer than `PICKUP_DISTANCE` to the player is taken: `collected` goes up by one and the event is `'pickup'`.
5. If `invulnerable` is 0 and any guard hits the player: lose a life, put the player back on the spawn (position and target), set `invulnerable` to `INVULNERABLE_TIME`, and the event is `'hit'`.
6. If all crystals are taken, `status` becomes `'won'` and the event is `'win'`. Otherwise, if `lives` is 0, `status` becomes `'lost'` and the event is `'lose'`.

`src/main.js` runs the game in the page:

- Build the level with `buildLevel`, add the player and guard meshes, and keep the camera looking at the whole level.
- Track pressed keys by `KeyboardEvent.code`. Each frame, call `stepGame` with `readInput(keys)` and `dt` in seconds, capped at 0.05.
- Read an optional `speed` URL parameter, for example `?speed=0.25`. Multiply `dt` by it after the cap. It slows the whole game down for play-testing. The default is 1.
- Move the meshes to the player and guard positions. Hide a crystal mesh once its crystal is taken. Make the player mesh blink while `invulnerable` is above 0.
- Update the HUD every frame. Play a sound for each event.
- **R** starts a new game.
- Expose the current game as `window.__game` so a play-tester can check the state from the browser console.
