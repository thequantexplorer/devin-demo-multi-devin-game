// Player system. See "Player" in docs/game-design.md.

/** @returns {{ x: number, z: number, targetX: number, targetZ: number, facing: 'up' | 'down' | 'left' | 'right' }} */
export function createPlayer(spawn) {
  throw new Error('Not implemented: createPlayer');
}

/** Map pressed keys to { up, down, left, right } booleans. */
export function readInput(keysDown) {
  throw new Error('Not implemented: readInput');
}

/** Move the player one frame. Mutates and returns the player. */
export function updatePlayer(player, input, dt, level) {
  throw new Error('Not implemented: updatePlayer');
}

/** @returns {import('three').Object3D} */
export function createPlayerMesh() {
  throw new Error('Not implemented: createPlayerMesh');
}
