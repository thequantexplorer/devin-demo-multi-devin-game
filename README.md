# Crystal Keep

A small 3D maze game for the browser, built with [three.js](https://threejs.org) and [Vite](https://vite.dev). Walk through the keep, pick up 5 crystals and avoid the guards.

The game is not built yet. `src/main.js` only draws an empty scene, and the four game systems in `src/systems/` are stubs. The full design is in [docs/game-design.md](docs/game-design.md).

```sh
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

Right now every test fails:

```text
 FAIL  tests/level.test.js > parseLevel > reads the size, spawn, crystals and enemies
Error: Not implemented: parseLevel
 ...
 Test Files  6 failed (6)
      Tests  48 failed (48)
```

| Folder | What is in it |
| --- | --- |
| `src/systems/` | level, player, enemies, HUD and audio (one file each, stubs) |
| `src/game.js` | game rules that join the systems (stub) |
| `src/main.js` | the page: renderer, camera, game loop |
| `src/levels/` | ASCII level maps |
| `tests/` | one test file per system, plus `game.test.js` for the joined game |
| `.agents/skills/play-test-game/` | how to run and play-test the game |

---

This repo is a starter for a Devin demo. See [DEVIN_DEMO.md](DEVIN_DEMO.md) for setup and the prompt.
