// Game rules that join the systems together. See "Game" in docs/game-design.md.
// Written last, after the four systems are merged.

export function createGame(levelText) {
  throw new Error('Not implemented: createGame');
}

/** Advance the game by dt seconds. Returns the events of this frame, e.g. ['pickup']. */
export function stepGame(game, input, dt) {
  throw new Error('Not implemented: stepGame');
}
