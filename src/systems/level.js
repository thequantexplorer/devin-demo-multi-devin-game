// Level system. See "Level" in docs/game-design.md.

/**
 * Turn an ASCII map into level data.
 * @param {string} text
 * @returns {{ width: number, height: number, spawn: {x: number, z: number},
 *   crystals: {x: number, z: number}[], enemies: {x: number, z: number, axis: 'x' | 'z'}[],
 *   isWall: (x: number, z: number) => boolean }}
 */
export function parseLevel(text) {
  throw new Error('Not implemented: parseLevel');
}

/**
 * Build the 3D meshes for the floor, walls and crystals.
 * @returns {import('three').Group}
 */
export function buildLevel(level) {
  throw new Error('Not implemented: buildLevel');
}
