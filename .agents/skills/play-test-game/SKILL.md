---
name: play-test-game
description: Run Crystal Keep in the browser and play-test it. Use before opening a PR that changes the game, and when recording a video of it.
---

## Run it

1. `npm install`
2. `npm test` and `npm run build` must both pass first.
3. `npm run dev` and wait for `Local: http://localhost:5173/`.
4. Open http://localhost:5173 in the browser. Click the page once so it gets keyboard focus.

## Play-test

Controls: WASD or arrow keys move one tile per press. R restarts.

Check the state at any time in the browser console with `window.__game`, for example `__game.player`, `__game.collected`, `__game.lives`, `__game.status`.

A good play-test shows, in this order:

1. The level, the blue player, 5 crystals and 3 red guards, and the HUD bar reading `Crystals 0/5 · Lives 3 · 0:00` (the timer counts up).
2. Moving: the player walks tile by tile and stops at walls.
3. A pickup: the crystal disappears, the HUD count goes up, and a sound plays.
4. A hit: walk into a guard. Lives go down by one, the player goes back to the start and blinks.
5. A win: collect all 5 crystals. The banner says `You win! Press R to play again`.

Short taps are easiest to control. Wait for a guard to pass before crossing its row or column.

If your key presses arrive more than about a quarter of a second apart (for example when driving the browser with computer use), open http://localhost:5173/?speed=0.25 instead. The whole game runs at quarter speed, so the guards are easy to avoid. Say in an annotation that the game is slowed down.

If a key press seems to do nothing, click the canvas again to give the page focus.

## Recording

Record the browser while doing the five steps above. Point out each step with a short annotation. If the page is blank, check the browser console for errors before recording.
