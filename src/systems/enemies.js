// Enemy system. See "Enemies" in docs/game-design.md.

/** @returns {{ x: number, z: number, axis: 'x' | 'z', dir: 1 | -1, min: number, max: number }[]} */
export function createEnemies(spawns, level) {
  throw new Error('Not implemented: createEnemies');
}

/** Move every enemy one frame. Mutates and returns the array. */
export function updateEnemies(enemies, dt) {
  throw new Error('Not implemented: updateEnemies');
}

/** True when the enemy is close enough to hurt the player. */
export function hitsPlayer(enemy, player) {
  throw new Error('Not implemented: hitsPlayer');
}

/** @returns {import('three').Object3D} */
export function createEnemyMesh() {
  throw new Error('Not implemented: createEnemyMesh');
}
