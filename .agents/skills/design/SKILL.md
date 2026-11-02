---
name: design
description: Visual design for Crystal Keep. Every child session and the integration step should follow it.
---

## Direction: a moody, torch-lit keep

A small 3D game that looks finished: atmosphere, light and clear readable shapes. Use only three.js and its built-in `examples/jsm` add-ons. Do not add packages.

- Renderer: antialias on, `ACESFilmicToneMapping`, sRGB output, soft shadows on. Background and fog `#0B0E14` so the edges of the level fade into darkness.
- Light: a dim cool ambient light, one warm directional light that casts shadows, and a few warm point lights (`#FFB45C`) like torches along the walls.
- Floor: dark stone with a subtle checker made from a small canvas texture. Walls: stone-colored boxes (`#3A3F4A`) with a canvas-texture of bricks and slightly lighter top faces.
- Crystals: glowing cyan octahedrons (`#5CE1FF`, emissive), slowly spinning and bobbing, each with a small cyan point light. Add `UnrealBloomPass` from `three/examples/jsm` so they glow.
- Player: a rounded, friendly shape (a capsule body with a small head) in warm white, facing the way it moves.
- Guards: dark red-armored shapes (`#B23A3A`) with a small orange lantern light, so they are easy to spot.
- Pickups and hits: a quick burst of particles and a short camera shake on hit; the player blinks while safe after a hit.
- HUD (`src/style.css`, `hud.js`): a translucent dark glass bar at the top center with icons or short labels for crystals, lives and time, using `ui-monospace` numbers. The win and game over banner is a centered glass panel with a big title and "Press R to play again".

States to screenshot: the start of the level, a crystal pickup, a guard hit, and the win banner.

## Rules for every screen

- One clear visual direction, used everywhere. No default framework or browser look (no unstyled inputs, no default blue links, no stock Material purple).
- Sans-serif type only. Use a real type scale with a few sizes, not many. Large, confident headings; quiet secondary text.
- Mostly neutral colors plus one accent. Use color for meaning (selected, done, error), not decoration. No purple or pink.
- Even spacing on an 8 px grid. Generous margins. Line up edges.
- Every interactive element has hover (or pressed), focus and disabled states.
- Design the empty state, the error state and the full state, not just one.
- Small, quick motion (150 to 250 ms) when things appear, change or finish.
- Support light and dark appearance if the platform has it, and check both.

## Check before you open the pull request

1. Take screenshots of every screen and state in the list above.
2. Look at each one at full size. Fix anything that is misaligned, cramped, clipped, low contrast or looks unfinished.
3. Put the final screenshots in the pull request description.
