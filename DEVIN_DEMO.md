# Devin demo: Build a 3D game with several Devins in parallel

**What it shows:** One Devin session splits a small three.js game into four systems and starts a child Devin session for each one. The children work at the same time on separate branches. The first session then merges their branches, joins the systems together, plays the game in its browser and records a video.

**Needs:** GitHub only

More demos: [devin-advanced-demos](https://github.com/thequantexplorer/devin-advanced-demos)

## The starting point

- `src/main.js` draws an empty scene.
- `docs/game-design.md` describes the game and splits it into four systems: level, player, enemies, and HUD and audio. Each system has its own file, its own test file and its own branch name.
- Every test fails, because every system is a stub:

```text
 FAIL  tests/player.test.js > updatePlayer > a short tap moves exactly one tile
Error: Not implemented: createPlayer
 ...
 Test Files  6 failed (6)
      Tests  48 failed (48)
```

## Set it up

1. Click **Use this template → Create a new repository**, choose your GitHub account or org as the owner, and keep the name `devin-demo-multi-devin-game`. The links and prompt below assume that name. Use the template rather than a fork: pull requests on a fork go to the original repo by default.
2. In Devin, open [**Settings → Connections → GitHub**](https://app.devin.ai/settings/connections/github) and make sure Devin can access the new repository.

This lab runs five Devin sessions: the one you start and four child sessions. Devin starts child sessions without asking unless you turned off **Auto-approve child sessions** in [Settings → Preferences](https://app.devin.ai/settings/preferences#auto-approve-child-sessions). If you did, approve them when Devin asks.

## Prompt

Start a new Devin session and paste this. Replace `<you>` with your GitHub user or org.

```text
Build the game described in docs/game-design.md in https://github.com/<you>/devin-demo-multi-devin-game, using several Devins in parallel.

Follow the repo's design skill. The result should look like a finished, polished product.

1. Read docs/game-design.md and run npm test to see the failing tests.
2. Start four child Devin sessions at the same time, one per system in the design doc: level, player, enemies, and HUD and audio. Tell each child its section of the design doc, the files it owns, its test file and its branch (system/level, system/player, system/enemies, system/hud-audio). Each child only edits its own files, makes its own tests pass, and pushes its branch. Children do not open pull requests.
3. Wait for all four to finish. Do not write their code yourself.
4. Create the branch integrate/game from main and merge the four branches into it. Then write src/game.js and src/main.js as the design doc describes, until npm test and npm run build pass.
5. Play-test the game in the browser with the play-test-game skill in .agents/skills/, and record it. The video must show the player moving, a crystal pickup, a hit by a guard, and a win.
6. Open one pull request from integrate/game to main. In the description, list each child session with its branch, show the test results, and describe what the recording shows.
```

## What to watch

- The child sessions appear under your session in the sidebar. Click one to watch it work.
- Each child pushes its own `system/*` branch. The other test files still fail on that branch, which is expected.
- The first session merges the branches, writes the game loop, then plays the game in its own browser.

## Done when

- One pull request from `integrate/game` has a green **CI** check.
- You have a video of the game: moving, a pickup, a hit and a win.
- The pull request lists the four child sessions and their branches.
